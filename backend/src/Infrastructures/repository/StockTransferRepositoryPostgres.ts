import { Pool, PoolClient } from 'pg';
import {
  StockTransferRepository,
  NewStockTransferData,
  StockTransferListFilter,
  StockTransferListResult,
} from '../../Domains/stock-transfers/StockTransferRepository';
import {
  StockTransfer,
  StockTransferItem,
} from '../../Domains/stock-transfers/entities/StockTransfer';
import { TransferStatus, canTransition } from '../../Domains/stock-transfers/transferStatus';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';

interface HeaderRow {
  id: string;
  company_id: string;
  source_outlet_id: string;
  destination_outlet_id: string;
  transfer_number: string;
  transfer_date: Date;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  source_batch_id: string;
  product_id: string;
  qty: string;
  batch_number: string;
  lot_key: string;
  lot_number: string | null;
  expired_date: Date | null;
  destination_batch_id: string | null;
}

const HEADER_COLUMNS = `id, company_id, source_outlet_id, destination_outlet_id, transfer_number, transfer_date, status, notes, created_at, updated_at`;
const ITEM_COLUMNS = `id, source_batch_id, product_id, qty, batch_number, lot_key, lot_number, expired_date, destination_batch_id`;

/**
 * Concrete PostgreSQL implementation of StockTransferRepository.
 * Raw SQL, company-scoped. Dispatch/receive are atomic & concurrency-safe.
 */
export class StockTransferRepositoryPostgres extends StockTransferRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toItem(row: ItemRow): StockTransferItem {
    return {
      id: row.id,
      sourceBatchId: row.source_batch_id,
      productId: row.product_id,
      qty: Number(row.qty),
      batchNumber: row.batch_number,
      lotKey: row.lot_key,
      lotNumber: row.lot_number,
      expiredDate: row.expired_date,
      destinationBatchId: row.destination_batch_id,
    };
  }

  private _toTransfer(header: HeaderRow, items: ItemRow[]): StockTransfer {
    return new StockTransfer({
      id: header.id,
      companyId: header.company_id,
      sourceOutletId: header.source_outlet_id,
      destinationOutletId: header.destination_outlet_id,
      transferNumber: header.transfer_number,
      transferDate: header.transfer_date,
      status: header.status as TransferStatus,
      notes: header.notes,
      items: items.map((i) => this._toItem(i)),
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  private async _generateNumber(client: PoolClient, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TRF-${year}-`;
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM stock_transfers
       WHERE company_id = $1 AND transfer_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _loadItems(client: PoolClient, transferId: string): Promise<ItemRow[]> {
    const result = await client.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM stock_transfer_items
       WHERE stock_transfer_id = $1 ORDER BY created_at ASC`,
      [transferId],
    );
    return result.rows;
  }

  /**
   * Insert transfer items, snapshotting batch identity from each source batch.
   * Reused by createDraft + updateDraft. Assumes batches already validated.
   */
  private async _insertItems(
    client: PoolClient,
    companyId: string,
    transferId: string,
    items: NewStockTransferData['items'],
  ): Promise<void> {
    for (const item of items) {
      const batchResult = await client.query<{
        batch_number: string;
        lot_key: string;
        lot_number: string | null;
        expired_date: Date | null;
      }>(
        `SELECT batch_number, lot_key, lot_number, expired_date
         FROM inventory_batches WHERE id = $1 AND company_id = $2`,
        [item.sourceBatchId, companyId],
      );
      if (!batchResult.rowCount) {
        throw new NotFoundError('INVENTORY_BATCH.NOT_FOUND');
      }
      const b = batchResult.rows[0];
      await client.query(
        `INSERT INTO stock_transfer_items
           (stock_transfer_id, source_batch_id, product_id, qty,
            batch_number, lot_key, lot_number, expired_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          transferId,
          item.sourceBatchId,
          item.productId,
          item.qty,
          b.batch_number,
          b.lot_key,
          b.lot_number,
          b.expired_date,
        ],
      );
    }
  }

  async createDraft(
    companyId: string,
    userId: string | null,
    data: NewStockTransferData,
  ): Promise<StockTransfer> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const number = await this._generateNumber(client, companyId);

      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO stock_transfers
           (company_id, source_outlet_id, destination_outlet_id, transfer_number,
            transfer_date, status, notes, created_by)
         VALUES ($1,$2,$3,$4, COALESCE($5::date, CURRENT_DATE), 'DRAFT', $6, $7)
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          data.sourceOutletId,
          data.destinationOutletId,
          number,
          data.transferDate,
          data.notes,
          userId,
        ],
      );
      const header = headerResult.rows[0];

      await this._insertItems(client, companyId, header.id, data.items);

      const items = await this._loadItems(client, header.id);
      await client.query('COMMIT');
      return this._toTransfer(header, items);
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
    data: NewStockTransferData,
  ): Promise<StockTransfer> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_transfers
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_TRANSFER.NOT_FOUND');
      }
      if (headerResult.rows[0].status !== 'DRAFT') {
        throw new InvariantError('STOCK_TRANSFER.ONLY_DRAFT_EDITABLE');
      }

      const updatedHeader = await client.query<HeaderRow>(
        `UPDATE stock_transfers
         SET source_outlet_id = $1, destination_outlet_id = $2,
             transfer_date = COALESCE($3::date, transfer_date),
             notes = $4, updated_at = NOW()
         WHERE id = $5 AND company_id = $6
         RETURNING ${HEADER_COLUMNS}`,
        [data.sourceOutletId, data.destinationOutletId, data.transferDate, data.notes, id, companyId],
      );

      await client.query(`DELETE FROM stock_transfer_items WHERE stock_transfer_id = $1`, [id]);
      await this._insertItems(client, companyId, id, data.items);

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toTransfer(updatedHeader.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<StockTransfer> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM stock_transfers WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('STOCK_TRANSFER.NOT_FOUND');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM stock_transfer_items
       WHERE stock_transfer_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return this._toTransfer(headerResult.rows[0], itemsResult.rows);
  }

  async list(
    companyId: string,
    filter: StockTransferListFilter,
  ): Promise<StockTransferListResult> {
    const conditions: string[] = ['company_id = $1'];
    const params: unknown[] = [companyId];

    if (filter.sourceOutletId) {
      params.push(filter.sourceOutletId);
      conditions.push(`source_outlet_id = $${params.length}`);
    }
    if (filter.destinationOutletId) {
      params.push(filter.destinationOutletId);
      conditions.push(`destination_outlet_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(transfer_number ILIKE $${params.length} OR notes ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM stock_transfers WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM stock_transfers
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const rows: StockTransfer[] = [];
    for (const header of headerResult.rows) {
      const itemsResult = await this.pool.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM stock_transfer_items
         WHERE stock_transfer_id = $1 ORDER BY created_at ASC`,
        [header.id],
      );
      rows.push(this._toTransfer(header, itemsResult.rows));
    }

    return { rows, total };
  }

  /** Simple status flip (submit/cancel) — no stock movement. */
  private async _changeStatus(
    id: string,
    companyId: string,
    userId: string | null,
    to: 'SUBMITTED' | 'CANCELLED',
  ): Promise<StockTransfer> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_transfers
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_TRANSFER.NOT_FOUND');
      }
      const current = headerResult.rows[0].status as TransferStatus;
      if (!canTransition(current, to)) {
        throw new InvariantError('STOCK_TRANSFER.INVALID_STATUS_TRANSITION');
      }

      const actorColumn = to === 'SUBMITTED' ? 'submitted_by' : null;
      const timeColumn = to === 'SUBMITTED' ? 'submitted_at' : 'cancelled_at';

      const sets: string[] = ['status = $1', 'updated_at = NOW()', `${timeColumn} = NOW()`];
      const params: unknown[] = [to];
      if (actorColumn) {
        params.push(userId);
        sets.push(`${actorColumn} = $${params.length}`);
      }
      params.push(id, companyId);

      const updated = await client.query<HeaderRow>(
        `UPDATE stock_transfers SET ${sets.join(', ')}
         WHERE id = $${params.length - 1} AND company_id = $${params.length}
         RETURNING ${HEADER_COLUMNS}`,
        params,
      );

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toTransfer(updated.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async submit(id: string, companyId: string, userId: string | null): Promise<StockTransfer> {
    return this._changeStatus(id, companyId, userId, 'SUBMITTED');
  }

  async cancel(id: string, companyId: string, userId: string | null): Promise<StockTransfer> {
    return this._changeStatus(id, companyId, userId, 'CANCELLED');
  }

  async dispatch(id: string, companyId: string, userId: string | null): Promise<StockTransfer> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_transfers
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_TRANSFER.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (!canTransition(header.status as TransferStatus, 'IN_TRANSIT')) {
        throw new InvariantError('STOCK_TRANSFER.INVALID_STATUS_TRANSITION');
      }

      const items = await this._loadItems(client, id);

      for (const item of items) {
        // Reload source batch under lock
        const batchResult = await client.query<{ qty_available: string }>(
          `SELECT qty_available FROM inventory_batches
           WHERE id = $1 AND company_id = $2 FOR UPDATE`,
          [item.source_batch_id, companyId],
        );
        if (!batchResult.rowCount) {
          throw new NotFoundError('INVENTORY_BATCH.NOT_FOUND');
        }
        const beforeQty = Number(batchResult.rows[0].qty_available);
        const qty = Number(item.qty);
        const afterQty = beforeQty - qty;
        if (afterQty < 0) {
          throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
        }

        await client.query(
          `UPDATE inventory_batches
           SET qty_available = $1::numeric,
               status = CASE WHEN $1::numeric = 0 THEN 'CONSUMED' ELSE status END,
               updated_at = NOW()
           WHERE id = $2 AND company_id = $3`,
          [afterQty, item.source_batch_id, companyId],
        );

        await client.query(
          `INSERT INTO inventory_movements
             (company_id, outlet_id, batch_id, product_id, movement_type,
              qty, before_qty, after_qty,
              source_document_type, source_document_id, source_document_item_id, user_id)
           VALUES ($1,$2,$3,$4,'TRANSFER_OUT',$5,$6,$7,'STOCK_TRANSFER',$8,$9,$10)`,
          [
            companyId,
            header.source_outlet_id,
            item.source_batch_id,
            item.product_id,
            qty,
            beforeQty,
            afterQty,
            id,
            item.id,
            userId,
          ],
        );
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE stock_transfers
         SET status = 'IN_TRANSIT', dispatched_by = $1, dispatched_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, id, companyId],
      );

      const finalItems = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toTransfer(updated.rows[0], finalItems);
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

  async receive(id: string, companyId: string, userId: string | null): Promise<StockTransfer> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM stock_transfers
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('STOCK_TRANSFER.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (!canTransition(header.status as TransferStatus, 'COMPLETED')) {
        throw new InvariantError('STOCK_TRANSFER.INVALID_STATUS_TRANSITION');
      }

      const items = await this._loadItems(client, id);

      for (const item of items) {
        const qty = Number(item.qty);

        // Resolve destination batch by (outlet + product + batch + lot); create if missing.
        const destResult = await client.query<{ id: string; qty_available: string }>(
          `SELECT id, qty_available FROM inventory_batches
           WHERE company_id = $1 AND outlet_id = $2 AND product_id = $3
             AND batch_number = $4 AND lot_key = $5
           FOR UPDATE`,
          [companyId, header.destination_outlet_id, item.product_id, item.batch_number, item.lot_key],
        );

        let destBatchId: string;
        let beforeQty: number;

        if (destResult.rowCount && destResult.rowCount > 0) {
          destBatchId = destResult.rows[0].id;
          beforeQty = Number(destResult.rows[0].qty_available);
          const afterQty = beforeQty + qty;
          await client.query(
            `UPDATE inventory_batches
             SET qty_available = $1, status = 'ACTIVE', updated_at = NOW()
             WHERE id = $2 AND company_id = $3`,
            [afterQty, destBatchId, companyId],
          );
        } else {
          beforeQty = 0;
          const insertResult = await client.query<{ id: string }>(
            `INSERT INTO inventory_batches
               (company_id, outlet_id, product_id, batch_number, lot_key, lot_number,
                expired_date, received_date, qty_available, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8,'ACTIVE')
             RETURNING id`,
            [
              companyId,
              header.destination_outlet_id,
              item.product_id,
              item.batch_number,
              item.lot_key,
              item.lot_number,
              item.expired_date,
              qty,
            ],
          );
          destBatchId = insertResult.rows[0].id;
        }

        const afterQty = beforeQty + qty;

        await client.query(
          `INSERT INTO inventory_movements
             (company_id, outlet_id, batch_id, product_id, movement_type,
              qty, before_qty, after_qty,
              source_document_type, source_document_id, source_document_item_id, user_id)
           VALUES ($1,$2,$3,$4,'TRANSFER_IN',$5,$6,$7,'STOCK_TRANSFER',$8,$9,$10)`,
          [
            companyId,
            header.destination_outlet_id,
            destBatchId,
            item.product_id,
            qty,
            beforeQty,
            afterQty,
            id,
            item.id,
            userId,
          ],
        );

        await client.query(
          `UPDATE stock_transfer_items SET destination_batch_id = $1 WHERE id = $2`,
          [destBatchId, item.id],
        );
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE stock_transfers
         SET status = 'COMPLETED', received_by = $1, received_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, id, companyId],
      );

      const finalItems = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toTransfer(updated.rows[0], finalItems);
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
