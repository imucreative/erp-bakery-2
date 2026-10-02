import { Pool, PoolClient } from 'pg';
import {
  StockOpnameRepository,
  StockOpnameListFilter,
  StockOpnameListResult,
} from '../../Domains/stock-opnames/StockOpnameRepository';
import { StockOpname, StockOpnameItem } from '../../Domains/stock-opnames/entities/StockOpname';
import {
  OpnameStatus,
  canTransition,
  OPNAME_LOCKING_STATUSES,
} from '../../Domains/stock-opnames/opnameStatus';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';

interface HeaderRow {
  id: string;
  company_id: string;
  outlet_id: string;
  opname_number: string;
  opname_date: Date;
  status: string;
  notes: string | null;
  generated_adjustment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  batch_id: string;
  product_id: string;
  system_qty: string;
  counted_qty: string | null;
  difference_qty: string | null;
}

const HEADER_COLUMNS = `id, company_id, outlet_id, opname_number, opname_date, status, notes, generated_adjustment_id, created_at, updated_at`;
const ITEM_COLUMNS = `id, batch_id, product_id, system_qty, counted_qty, difference_qty`;

/**
 * Concrete PostgreSQL implementation of StockOpnameRepository.
 * Raw SQL, company-scoped. start()/complete() are atomic & concurrency-safe.
 */
export class StockOpnameRepositoryPostgres extends StockOpnameRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toItem(row: ItemRow): StockOpnameItem {
    return {
      id: row.id,
      batchId: row.batch_id,
      productId: row.product_id,
      systemQty: Number(row.system_qty),
      countedQty: row.counted_qty === null ? null : Number(row.counted_qty),
      differenceQty: row.difference_qty === null ? null : Number(row.difference_qty),
    };
  }

  private _toOpname(header: HeaderRow, items: ItemRow[]): StockOpname {
    return new StockOpname({
      id: header.id,
      companyId: header.company_id,
      outletId: header.outlet_id,
      opnameNumber: header.opname_number,
      opnameDate: header.opname_date,
      status: header.status as OpnameStatus,
      notes: header.notes,
      generatedAdjustmentId: header.generated_adjustment_id,
      items: items.map((i) => this._toItem(i)),
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  private async _generateNumber(client: PoolClient, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OPN-${year}-`;
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM stock_opnames
       WHERE company_id = $1 AND opname_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _generateAdjustmentNumber(
    client: PoolClient,
    companyId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ADJ-${year}-`;
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM stock_adjustments
       WHERE company_id = $1 AND adjustment_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _loadItems(client: PoolClient, opnameId: string): Promise<ItemRow[]> {
    const result = await client.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM stock_opname_items
       WHERE stock_opname_id = $1 ORDER BY created_at ASC`,
      [opnameId],
    );
    return result.rows;
  }

  async createDraft(
    companyId: string,
    userId: string | null,
    data: { outletId: string; opnameDate: string | null; notes: string | null },
  ): Promise<StockOpname> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const number = await this._generateNumber(client, companyId);
      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO stock_opnames
           (company_id, outlet_id, opname_number, opname_date, status, notes, created_by)
         VALUES ($1,$2,$3, COALESCE($4::date, CURRENT_DATE), 'DRAFT', $5, $6)
         RETURNING ${HEADER_COLUMNS}`,
        [companyId, data.outletId, number, data.opnameDate, data.notes, userId],
      );
      await client.query('COMMIT');
      return this._toOpname(headerResult.rows[0], []);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async start(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_opnames
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_OPNAME.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (!canTransition(header.status as OpnameStatus, 'COUNTING')) {
        throw new InvariantError('STOCK_OPNAME.INVALID_STATUS_TRANSITION');
      }

      // Assert no other active opname locks this outlet (rule #24)
      const lockClash = await client.query(
        `SELECT id FROM stock_opnames
         WHERE company_id = $1 AND outlet_id = $2 AND id <> $3
           AND status = ANY($4::varchar[])`,
        [companyId, header.outlet_id, id, [...OPNAME_LOCKING_STATUSES]],
      );
      if (lockClash.rowCount && lockClash.rowCount > 0) {
        throw new InvariantError('STOCK_OPNAME.OUTLET_LOCKED');
      }

      // Snapshot every ACTIVE batch of the outlet into items
      await client.query(
        `INSERT INTO stock_opname_items (stock_opname_id, batch_id, product_id, system_qty)
         SELECT $1, b.id, b.product_id, b.qty_available
         FROM inventory_batches b
         WHERE b.company_id = $2 AND b.outlet_id = $3 AND b.status = 'ACTIVE'`,
        [id, companyId, header.outlet_id],
      );

      const updated = await client.query<HeaderRow>(
        `UPDATE stock_opnames
         SET status = 'COUNTING', started_by = $1, started_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, id, companyId],
      );

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toOpname(updated.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async recordCount(
    id: string,
    itemId: string,
    companyId: string,
    countedQty: number,
  ): Promise<StockOpname> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_opnames
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_OPNAME.NOT_FOUND');
      }
      if (headerResult.rows[0].status !== 'COUNTING') {
        throw new InvariantError('STOCK_OPNAME.NOT_COUNTING');
      }

      const itemResult = await client.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM stock_opname_items
         WHERE id = $1 AND stock_opname_id = $2`,
        [itemId, id],
      );
      if (!itemResult.rowCount) {
        throw new NotFoundError('STOCK_OPNAME.ITEM_NOT_FOUND');
      }

      const systemQty = Number(itemResult.rows[0].system_qty);
      const difference = countedQty - systemQty;

      await client.query(
        `UPDATE stock_opname_items SET counted_qty = $1, difference_qty = $2 WHERE id = $3`,
        [countedQty, difference, itemId],
      );

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toOpname(headerResult.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async _changeStatus(
    id: string,
    companyId: string,
    userId: string | null,
    to: 'SUBMITTED' | 'APPROVED' | 'CANCELLED',
  ): Promise<StockOpname> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_opnames
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_OPNAME.NOT_FOUND');
      }
      const current = headerResult.rows[0].status as OpnameStatus;
      if (!canTransition(current, to)) {
        throw new InvariantError('STOCK_OPNAME.INVALID_STATUS_TRANSITION');
      }

      const actorColumn =
        to === 'SUBMITTED' ? 'submitted_by' : to === 'APPROVED' ? 'approved_by' : null;
      const timeColumn =
        to === 'SUBMITTED'
          ? 'submitted_at'
          : to === 'APPROVED'
            ? 'approved_at'
            : 'cancelled_at';

      const sets: string[] = ['status = $1', 'updated_at = NOW()', `${timeColumn} = NOW()`];
      const params: unknown[] = [to];
      if (actorColumn) {
        params.push(userId);
        sets.push(`${actorColumn} = $${params.length}`);
      }
      params.push(id, companyId);

      const updated = await client.query<HeaderRow>(
        `UPDATE stock_opnames SET ${sets.join(', ')}
         WHERE id = $${params.length - 1} AND company_id = $${params.length}
         RETURNING ${HEADER_COLUMNS}`,
        params,
      );

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toOpname(updated.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async submit(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    return this._changeStatus(id, companyId, userId, 'SUBMITTED');
  }

  async approve(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    return this._changeStatus(id, companyId, userId, 'APPROVED');
  }

  async cancel(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    return this._changeStatus(id, companyId, userId, 'CANCELLED');
  }

  async complete(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_opnames
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_OPNAME.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (!canTransition(header.status as OpnameStatus, 'COMPLETED')) {
        throw new InvariantError('STOCK_OPNAME.INVALID_STATUS_TRANSITION');
      }

      const items = await this._loadItems(client, id);
      // Only items with a recorded, non-zero variance generate corrections
      const variances = items.filter(
        (it) => it.counted_qty !== null && Number(it.difference_qty) !== 0,
      );

      let generatedAdjustmentId: string | null = null;

      if (variances.length > 0) {
        // Create ONE generated Stock Adjustment (source_document_type = STOCK_OPNAME)
        const adjNumber = await this._generateAdjustmentNumber(client, companyId);
        const adjResult = await client.query<{ id: string }>(
          `INSERT INTO stock_adjustments
             (company_id, outlet_id, adjustment_number, adjustment_date, status, notes,
              created_by, submitted_by, approved_by, completed_by,
              submitted_at, approved_at, completed_at)
           VALUES ($1,$2,$3,CURRENT_DATE,'COMPLETED',$4,$5,$5,$5,$5,NOW(),NOW(),NOW())
           RETURNING id`,
          [
            companyId,
            header.outlet_id,
            adjNumber,
            `Auto-generated from Stock Opname ${header.opname_number}`,
            userId,
          ],
        );
        generatedAdjustmentId = adjResult.rows[0].id;

        for (const item of variances) {
          const difference = Number(item.difference_qty);
          const direction = difference > 0 ? 'IN' : 'OUT';
          const magnitude = Math.abs(difference);

          // Reload batch under lock, derive authoritative before/after
          const batchResult = await client.query<{ qty_available: string }>(
            `SELECT qty_available FROM inventory_batches
             WHERE id = $1 AND company_id = $2 FOR UPDATE`,
            [item.batch_id, companyId],
          );
          if (!batchResult.rowCount) {
            throw new NotFoundError('INVENTORY_BATCH.NOT_FOUND');
          }
          const beforeQty = Number(batchResult.rows[0].qty_available);
          const afterQty = beforeQty + difference; // difference already signed
          if (afterQty < 0) {
            throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
          }

          // Persist the adjustment line
          const adjItemResult = await client.query<{ id: string }>(
            `INSERT INTO stock_adjustment_items
               (stock_adjustment_id, batch_id, product_id, direction, qty, reason,
                reason_description, before_qty, after_qty)
             VALUES ($1,$2,$3,$4,$5,'STOCK_COUNT',$6,$7,$8)
             RETURNING id`,
            [
              generatedAdjustmentId,
              item.batch_id,
              item.product_id,
              direction,
              magnitude,
              `Opname variance ${difference}`,
              beforeQty,
              afterQty,
            ],
          );

          // Mutate batch balance
          await client.query(
            `UPDATE inventory_batches
             SET qty_available = $1::numeric,
                 status = CASE WHEN $1::numeric = 0 THEN 'CONSUMED' ELSE status END,
                 updated_at = NOW()
             WHERE id = $2 AND company_id = $3`,
            [afterQty, item.batch_id, companyId],
          );

          // Append canonical ADJUSTMENT_IN/OUT movement (rule #25)
          const movementType = direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
          await client.query(
            `INSERT INTO inventory_movements
               (company_id, outlet_id, batch_id, product_id, movement_type,
                qty, before_qty, after_qty,
                source_document_type, source_document_id, source_document_item_id,
                notes, user_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'STOCK_OPNAME',$9,$10,$11,$12)`,
            [
              companyId,
              header.outlet_id,
              item.batch_id,
              item.product_id,
              movementType,
              magnitude,
              beforeQty,
              afterQty,
              id,
              adjItemResult.rows[0].id,
              `Opname ${header.opname_number}`,
              userId,
            ],
          );
        }
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE stock_opnames
         SET status = 'COMPLETED', completed_by = $1, completed_at = NOW(),
             generated_adjustment_id = $2, updated_at = NOW()
         WHERE id = $3 AND company_id = $4
         RETURNING ${HEADER_COLUMNS}`,
        [userId, generatedAdjustmentId, id, companyId],
      );

      const finalItems = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toOpname(updated.rows[0], finalItems);
    } catch (err) {
      await client.query('ROLLBACK');
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new InvariantError('INVENTORY.DUPLICATE_MOVEMENT_SOURCE');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<StockOpname> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM stock_opnames WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('STOCK_OPNAME.NOT_FOUND');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM stock_opname_items
       WHERE stock_opname_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return this._toOpname(headerResult.rows[0], itemsResult.rows);
  }

  async list(companyId: string, filter: StockOpnameListFilter): Promise<StockOpnameListResult> {
    const conditions: string[] = ['company_id = $1'];
    const params: unknown[] = [companyId];

    if (filter.outletId) {
      params.push(filter.outletId);
      conditions.push(`outlet_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(opname_number ILIKE $${params.length} OR notes ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM stock_opnames WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM stock_opnames
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const rows: StockOpname[] = [];
    for (const header of headerResult.rows) {
      const itemsResult = await this.pool.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM stock_opname_items
         WHERE stock_opname_id = $1 ORDER BY created_at ASC`,
        [header.id],
      );
      rows.push(this._toOpname(header, itemsResult.rows));
    }

    return { rows, total };
  }
}
