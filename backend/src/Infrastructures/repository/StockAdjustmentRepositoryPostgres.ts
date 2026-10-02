import { Pool, PoolClient } from 'pg';
import {
  StockAdjustmentRepository,
  NewStockAdjustmentData,
  StockAdjustmentListFilter,
  StockAdjustmentListResult,
} from '../../Domains/stock-adjustments/StockAdjustmentRepository';
import {
  StockAdjustment,
  StockAdjustmentItem,
} from '../../Domains/stock-adjustments/entities/StockAdjustment';
import { AdjustmentStatus, canTransition } from '../../Domains/stock-adjustments/adjustmentStatus';
import {
  AdjustmentDirection,
  AdjustmentReason,
} from '../../Domains/stock-adjustments/adjustmentReason';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';

interface HeaderRow {
  id: string;
  company_id: string;
  outlet_id: string;
  adjustment_number: string;
  adjustment_date: Date;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  batch_id: string;
  product_id: string;
  direction: string;
  qty: string;
  reason: string;
  reason_description: string | null;
  before_qty: string | null;
  after_qty: string | null;
}

const HEADER_COLUMNS = `id, company_id, outlet_id, adjustment_number, adjustment_date, status, notes, created_at, updated_at`;
const ITEM_COLUMNS = `id, batch_id, product_id, direction, qty, reason, reason_description, before_qty, after_qty`;

/**
 * Concrete PostgreSQL implementation of StockAdjustmentRepository.
 * Raw SQL, company-scoped. Completion is atomic & concurrency-safe (rule #20).
 */
export class StockAdjustmentRepositoryPostgres extends StockAdjustmentRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toItem(row: ItemRow): StockAdjustmentItem {
    return {
      id: row.id,
      batchId: row.batch_id,
      productId: row.product_id,
      direction: row.direction as AdjustmentDirection,
      qty: Number(row.qty),
      reason: row.reason as AdjustmentReason,
      reasonDescription: row.reason_description,
      beforeQty: row.before_qty === null ? null : Number(row.before_qty),
      afterQty: row.after_qty === null ? null : Number(row.after_qty),
    };
  }

  private _toAdjustment(header: HeaderRow, items: ItemRow[]): StockAdjustment {
    return new StockAdjustment({
      id: header.id,
      companyId: header.company_id,
      outletId: header.outlet_id,
      adjustmentNumber: header.adjustment_number,
      adjustmentDate: header.adjustment_date,
      status: header.status as AdjustmentStatus,
      notes: header.notes,
      items: items.map((i) => this._toItem(i)),
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  /** Generate ADJ-YYYY-NNNNNN scoped to company + year. Uses provided client. */
  private async _generateNumber(client: PoolClient, companyId: string): Promise<string> {
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

  private async _loadItems(client: PoolClient, adjustmentId: string): Promise<ItemRow[]> {
    const result = await client.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM stock_adjustment_items
       WHERE stock_adjustment_id = $1 ORDER BY created_at ASC`,
      [adjustmentId],
    );
    return result.rows;
  }

  async createDraft(
    companyId: string,
    userId: string | null,
    data: NewStockAdjustmentData,
  ): Promise<StockAdjustment> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const number = await this._generateNumber(client, companyId);

      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO stock_adjustments
           (company_id, outlet_id, adjustment_number, adjustment_date, status, notes, created_by)
         VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), 'DRAFT', $5, $6)
         RETURNING ${HEADER_COLUMNS}`,
        [companyId, data.outletId, number, data.adjustmentDate, data.notes, userId],
      );
      const header = headerResult.rows[0];

      for (const item of data.items) {
        await client.query(
          `INSERT INTO stock_adjustment_items
             (stock_adjustment_id, batch_id, product_id, direction, qty, reason, reason_description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            header.id,
            item.batchId,
            item.productId,
            item.direction,
            item.qty,
            item.reason,
            item.reasonDescription ?? null,
          ],
        );
      }

      const items = await this._loadItems(client, header.id);
      await client.query('COMMIT');
      return this._toAdjustment(header, items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateDraft(
    id: string,
    companyId: string,
    data: NewStockAdjustmentData,
  ): Promise<StockAdjustment> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_adjustments
         WHERE id = $1 AND company_id = $2
         FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_ADJUSTMENT.NOT_FOUND');
      }
      if (headerResult.rows[0].status !== 'DRAFT') {
        throw new InvariantError('STOCK_ADJUSTMENT.ONLY_DRAFT_EDITABLE');
      }

      const updatedHeader = await client.query<HeaderRow>(
        `UPDATE stock_adjustments
         SET outlet_id = $1, adjustment_date = COALESCE($2::date, adjustment_date),
             notes = $3, updated_at = NOW()
         WHERE id = $4 AND company_id = $5
         RETURNING ${HEADER_COLUMNS}`,
        [data.outletId, data.adjustmentDate, data.notes, id, companyId],
      );

      // Replace items wholesale
      await client.query(`DELETE FROM stock_adjustment_items WHERE stock_adjustment_id = $1`, [id]);
      for (const item of data.items) {
        await client.query(
          `INSERT INTO stock_adjustment_items
             (stock_adjustment_id, batch_id, product_id, direction, qty, reason, reason_description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            item.batchId,
            item.productId,
            item.direction,
            item.qty,
            item.reason,
            item.reasonDescription ?? null,
          ],
        );
      }

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toAdjustment(updatedHeader.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<StockAdjustment> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM stock_adjustments WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('STOCK_ADJUSTMENT.NOT_FOUND');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM stock_adjustment_items
       WHERE stock_adjustment_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return this._toAdjustment(headerResult.rows[0], itemsResult.rows);
  }

  async list(
    companyId: string,
    filter: StockAdjustmentListFilter,
  ): Promise<StockAdjustmentListResult> {
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
      conditions.push(`(adjustment_number ILIKE $${params.length} OR notes ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM stock_adjustments WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM stock_adjustments
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    // Load items per header (lists are page-limited so this is bounded)
    const rows: StockAdjustment[] = [];
    for (const header of headerResult.rows) {
      const itemsResult = await this.pool.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM stock_adjustment_items
         WHERE stock_adjustment_id = $1 ORDER BY created_at ASC`,
        [header.id],
      );
      rows.push(this._toAdjustment(header, itemsResult.rows));
    }

    return { rows, total };
  }

  async changeStatus(
    id: string,
    companyId: string,
    userId: string | null,
    to: Exclude<AdjustmentStatus, 'COMPLETED'>,
  ): Promise<StockAdjustment> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_adjustments
         WHERE id = $1 AND company_id = $2
         FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_ADJUSTMENT.NOT_FOUND');
      }

      const current = headerResult.rows[0].status as AdjustmentStatus;
      if (!canTransition(current, to)) {
        throw new InvariantError('STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION');
      }

      // Map the transition to its actor + timestamp columns
      const actorColumn =
        to === 'SUBMITTED' ? 'submitted_by' : to === 'APPROVED' ? 'approved_by' : null;
      const timeColumn =
        to === 'SUBMITTED'
          ? 'submitted_at'
          : to === 'APPROVED'
            ? 'approved_at'
            : to === 'CANCELLED'
              ? 'cancelled_at'
              : null;

      const sets: string[] = ['status = $1', 'updated_at = NOW()'];
      const params: unknown[] = [to];
      if (timeColumn) sets.push(`${timeColumn} = NOW()`);
      if (actorColumn) {
        params.push(userId);
        sets.push(`${actorColumn} = $${params.length}`);
      }
      params.push(id, companyId);

      const updated = await client.query<HeaderRow>(
        `UPDATE stock_adjustments SET ${sets.join(', ')}
         WHERE id = $${params.length - 1} AND company_id = $${params.length}
         RETURNING ${HEADER_COLUMNS}`,
        params,
      );

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toAdjustment(updated.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async complete(id: string, companyId: string, userId: string | null): Promise<StockAdjustment> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // Lock the header
      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_adjustments
         WHERE id = $1 AND company_id = $2
         FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_ADJUSTMENT.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (!canTransition(header.status as AdjustmentStatus, 'COMPLETED')) {
        throw new InvariantError('STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION');
      }

      const itemRows = await this._loadItems(client, id);

      for (const item of itemRows) {
        // Reload the exact batch balance under lock
        const batchResult = await client.query<{ qty_available: string }>(
          `SELECT qty_available FROM inventory_batches
           WHERE id = $1 AND company_id = $2
           FOR UPDATE`,
          [item.batch_id, companyId],
        );
        if (!batchResult.rowCount) {
          throw new NotFoundError('INVENTORY_BATCH.NOT_FOUND');
        }

        const beforeQty = Number(batchResult.rows[0].qty_available);
        const qty = Number(item.qty);
        const delta = item.direction === 'IN' ? qty : -qty;
        const afterQty = beforeQty + delta;

        if (afterQty < 0) {
          // OUT adjustment must not produce negative stock (rule #21)
          throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
        }

        // Mutate authoritative balance
        await client.query(
          `UPDATE inventory_batches
           SET qty_available = $1::numeric,
               status = CASE WHEN $1::numeric = 0 THEN 'CONSUMED' ELSE status END,
               updated_at = NOW()
           WHERE id = $2 AND company_id = $3`,
          [afterQty, item.batch_id, companyId],
        );

        // Append immutable ledger row (ADJUSTMENT_IN / ADJUSTMENT_OUT, rule #22)
        const movementType = item.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
        await client.query(
          `INSERT INTO inventory_movements
             (company_id, outlet_id, batch_id, product_id, movement_type,
              qty, before_qty, after_qty,
              source_document_type, source_document_id, source_document_item_id,
              notes, user_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'STOCK_ADJUSTMENT',$9,$10,$11,$12)`,
          [
            companyId,
            header.outlet_id,
            item.batch_id,
            item.product_id,
            movementType,
            qty,
            beforeQty,
            afterQty,
            id,
            item.id,
            item.reason_description,
            userId,
          ],
        );

        // Persist authoritative before/after snapshot on the item (rule #20)
        await client.query(
          `UPDATE stock_adjustment_items SET before_qty = $1, after_qty = $2 WHERE id = $3`,
          [beforeQty, afterQty, item.id],
        );
      }

      // Flip header to COMPLETED
      const updated = await client.query<HeaderRow>(
        `UPDATE stock_adjustments
         SET status = 'COMPLETED', completed_by = $1, completed_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, id, companyId],
      );

      const finalItems = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toAdjustment(updated.rows[0], finalItems);
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
}
