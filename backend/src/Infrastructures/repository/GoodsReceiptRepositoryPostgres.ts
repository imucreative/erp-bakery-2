import { Pool, PoolClient } from 'pg';
import {
  GoodsReceiptRepository,
  NewGoodsReceiptData,
  GoodsReceiptListFilter,
  GoodsReceiptListResult,
} from '../../Domains/goods-receipts/GoodsReceiptRepository';
import {
  GoodsReceipt,
  GoodsReceiptItem,
  GoodsReceiptStatusLog,
} from '../../Domains/goods-receipts/entities/GoodsReceipt';
import {
  GoodsReceiptStatus,
  canTransition,
  isEditableStatus,
} from '../../Domains/goods-receipts/goodsReceiptStatus';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';

interface HeaderRow {
  id: string;
  company_id: string;
  gr_number: string;
  purchase_order_id: string;
  supplier_id: string;
  destination_outlet_id: string;
  receive_date: Date;
  status: string;
  inventory_posted_at: Date | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  purchase_order_item_id: string;
  product_id: string;
  ordered_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  uom_id: string;
  batch_number: string | null;
  lot_number: string | null;
  expiry_date: Date | null;
}

interface LogRow {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  actor_name: string | null;
  note: string | null;
  created_at: Date;
}

const HEADER_COLUMNS = `id, company_id, gr_number, purchase_order_id, supplier_id,
  destination_outlet_id, receive_date, status, inventory_posted_at, notes,
  approved_by, approved_at, created_by, updated_by, created_at, updated_at`;
const ITEM_COLUMNS = `id, purchase_order_item_id, product_id, ordered_quantity,
  accepted_quantity, rejected_quantity, uom_id, batch_number, lot_number, expiry_date`;

/**
 * Status-log columns with the actor name resolved via LEFT JOIN to users.
 * `actor_name` is null when the actor user was removed.
 */
const LOG_SELECT = `SELECT l.id, l.from_status, l.to_status, l.actor_id,
    actor_users.name AS actor_name, l.note, l.created_at
  FROM goods_receipt_status_logs l
  LEFT JOIN users actor_users ON actor_users.id = l.actor_id`;

/**
 * Concrete PostgreSQL implementation of GoodsReceiptRepository.
 *
 * Raw SQL, company-scoped. Create-with-items and the cancel transition run in a
 * transaction, and each transition writes a goods_receipt_status_logs row
 * atomically with the header change so the timeline never drifts.
 *
 * Stage 1: no inventory posting; the complete action arrives in Stage 2.
 */
export class GoodsReceiptRepositoryPostgres extends GoodsReceiptRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toItem(row: ItemRow): GoodsReceiptItem {
    return {
      id: row.id,
      purchaseOrderItemId: row.purchase_order_item_id,
      productId: row.product_id,
      orderedQuantity: Number(row.ordered_quantity),
      acceptedQuantity: Number(row.accepted_quantity),
      rejectedQuantity: Number(row.rejected_quantity),
      uomId: row.uom_id,
      batchNumber: row.batch_number,
      lotNumber: row.lot_number,
      expiryDate: row.expiry_date,
    };
  }

  private _toLog(row: LogRow): GoodsReceiptStatusLog {
    return {
      id: row.id,
      fromStatus: (row.from_status as GoodsReceiptStatus) ?? null,
      toStatus: row.to_status as GoodsReceiptStatus,
      actorId: row.actor_id,
      actorName: row.actor_name,
      note: row.note,
      createdAt: row.created_at,
    };
  }

  private _toGoodsReceipt(
    header: HeaderRow,
    items: ItemRow[],
    logs: LogRow[],
  ): GoodsReceipt {
    return new GoodsReceipt({
      id: header.id,
      companyId: header.company_id,
      grNumber: header.gr_number,
      purchaseOrderId: header.purchase_order_id,
      supplierId: header.supplier_id,
      destinationOutletId: header.destination_outlet_id,
      receiveDate: header.receive_date,
      status: header.status as GoodsReceiptStatus,
      inventoryPostedAt: header.inventory_posted_at,
      notes: header.notes,
      items: items.map((i) => this._toItem(i)),
      statusLogs: logs.map((l) => this._toLog(l)),
      approvedBy: header.approved_by,
      approvedAt: header.approved_at,
      createdBy: header.created_by,
      updatedBy: header.updated_by,
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  /**
   * Generate a GR number `GR-YYYY-NNNNNN`, per company, per year (NO outlet
   * code — doc 26 §10). Serial is derived from the current max serial for that
   * (company, year) prefix. Called inside the create transaction; a duplicate
   * would still be caught by the partial unique index.
   */
  private async _generateNumber(client: PoolClient, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GR-${year}-`;
    const result = await client.query<{ max_serial: string | null }>(
      `SELECT MAX(CAST(RIGHT(gr_number, 6) AS INTEGER)) AS max_serial
       FROM goods_receipts
       WHERE company_id = $1 AND gr_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const current = result.rows[0]?.max_serial ? parseInt(result.rows[0].max_serial, 10) : 0;
    const seq = current + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _loadItems(client: PoolClient, grId: string): Promise<ItemRow[]> {
    const result = await client.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM goods_receipt_items
       WHERE goods_receipt_id = $1 ORDER BY created_at ASC, id ASC`,
      [grId],
    );
    return result.rows;
  }

  private async _loadLogs(client: PoolClient, grId: string): Promise<LogRow[]> {
    const result = await client.query<LogRow>(
      `${LOG_SELECT}
       WHERE l.goods_receipt_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
      [grId],
    );
    return result.rows;
  }

  private async _insertItems(
    client: PoolClient,
    grId: string,
    items: NewGoodsReceiptData['items'],
  ): Promise<void> {
    for (const item of items) {
      await client.query(
        `INSERT INTO goods_receipt_items
           (goods_receipt_id, purchase_order_item_id, product_id, ordered_quantity,
            accepted_quantity, rejected_quantity, uom_id, batch_number, lot_number, expiry_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::date)`,
        [
          grId,
          item.purchaseOrderItemId,
          item.productId,
          item.orderedQuantity,
          item.acceptedQuantity,
          item.rejectedQuantity,
          item.uomId,
          item.batchNumber,
          item.lotNumber,
          item.expiryDate,
        ],
      );
    }
  }

  private async _insertLog(
    client: PoolClient,
    grId: string,
    fromStatus: GoodsReceiptStatus | null,
    toStatus: GoodsReceiptStatus,
    actorId: string | null,
    note: string | null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO goods_receipt_status_logs
         (goods_receipt_id, from_status, to_status, actor_id, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [grId, fromStatus, toStatus, actorId, note],
    );
  }

  async createDraft(
    companyId: string,
    userId: string | null,
    data: NewGoodsReceiptData,
  ): Promise<GoodsReceipt> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const number = await this._generateNumber(client, companyId);

      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO goods_receipts
           (company_id, gr_number, purchase_order_id, supplier_id, destination_outlet_id,
            receive_date, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6::date,'DRAFT',$7,$8)
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          number,
          data.purchaseOrderId,
          data.supplierId,
          data.destinationOutletId,
          data.receiveDate,
          data.notes,
          userId,
        ],
      );
      const header = headerResult.rows[0];

      await this._insertItems(client, header.id, data.items);
      await this._insertLog(client, header.id, null, 'DRAFT', userId, null);

      const items = await this._loadItems(client, header.id);
      const logs = await this._loadLogs(client, header.id);
      await client.query('COMMIT');
      return this._toGoodsReceipt(header, items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw this._translateConflict(err);
    } finally {
      client.release();
    }
  }

  async updateDraft(
    id: string,
    companyId: string,
    userId: string | null,
    data: NewGoodsReceiptData,
  ): Promise<GoodsReceipt> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM goods_receipts
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('GOODS_RECEIPT.NOT_FOUND');
      }
      const current = headerResult.rows[0].status as GoodsReceiptStatus;
      if (!isEditableStatus(current)) {
        throw new InvariantError('GOODS_RECEIPT.ONLY_EDITABLE_STATUS');
      }

      const updatedHeader = await client.query<HeaderRow>(
        `UPDATE goods_receipts
         SET purchase_order_id = $1, supplier_id = $2, destination_outlet_id = $3,
             receive_date = $4::date, notes = $5, updated_by = $6, updated_at = NOW()
         WHERE id = $7 AND company_id = $8
         RETURNING ${HEADER_COLUMNS}`,
        [
          data.purchaseOrderId,
          data.supplierId,
          data.destinationOutletId,
          data.receiveDate,
          data.notes,
          userId,
          id,
          companyId,
        ],
      );

      await client.query(`DELETE FROM goods_receipt_items WHERE goods_receipt_id = $1`, [id]);
      await this._insertItems(client, id, data.items);

      const items = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toGoodsReceipt(updatedHeader.rows[0], items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw this._translateConflict(err);
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<GoodsReceipt> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM goods_receipts
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('GOODS_RECEIPT.NOT_FOUND');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM goods_receipt_items
       WHERE goods_receipt_id = $1 ORDER BY created_at ASC, id ASC`,
      [id],
    );
    const logsResult = await this.pool.query<LogRow>(
      `${LOG_SELECT}
       WHERE l.goods_receipt_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
      [id],
    );
    return this._toGoodsReceipt(headerResult.rows[0], itemsResult.rows, logsResult.rows);
  }

  async list(
    companyId: string,
    filter: GoodsReceiptListFilter,
  ): Promise<GoodsReceiptListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filter.purchaseOrderId) {
      params.push(filter.purchaseOrderId);
      conditions.push(`purchase_order_id = $${params.length}`);
    }
    if (filter.supplierId) {
      params.push(filter.supplierId);
      conditions.push(`supplier_id = $${params.length}`);
    }
    if (filter.destinationOutletId) {
      params.push(filter.destinationOutletId);
      conditions.push(`destination_outlet_id = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(gr_number ILIKE $${params.length} OR notes ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM goods_receipts WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM goods_receipts
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const rows: GoodsReceipt[] = [];
    for (const header of headerResult.rows) {
      const itemsResult = await this.pool.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM goods_receipt_items
         WHERE goods_receipt_id = $1 ORDER BY created_at ASC, id ASC`,
        [header.id],
      );
      const logsResult = await this.pool.query<LogRow>(
        `${LOG_SELECT}
         WHERE l.goods_receipt_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
        [header.id],
      );
      rows.push(this._toGoodsReceipt(header, itemsResult.rows, logsResult.rows));
    }

    return { rows, total };
  }

  async getConsumedQtyByPoItem(
    purchaseOrderId: string,
    companyId: string,
    excludeGoodsReceiptId?: string,
  ): Promise<Map<string, number>> {
    // Sum (accepted + rejected) per PO line from CONSUMING GRs of this PO.
    // Selecting status IN (DRAFT, COMPLETED) automatically excludes CANCELLED
    // (which is also soft-deleted), so its consumption returns to the PO. The
    // deleted_at IS NULL guard keeps any soft-deleted header out of the sum.
    const params: unknown[] = [purchaseOrderId, companyId];
    let excludeClause = '';
    if (excludeGoodsReceiptId) {
      params.push(excludeGoodsReceiptId);
      excludeClause = ` AND gr.id <> $${params.length}`;
    }

    const result = await this.pool.query<{ purchase_order_item_id: string; consumed: string }>(
      `SELECT gri.purchase_order_item_id AS purchase_order_item_id,
              SUM(gri.accepted_quantity + gri.rejected_quantity) AS consumed
       FROM goods_receipt_items gri
       JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
       WHERE gr.purchase_order_id = $1
         AND gr.company_id = $2
         AND gr.deleted_at IS NULL
         AND gr.status IN ('DRAFT','COMPLETED')${excludeClause}
       GROUP BY gri.purchase_order_item_id`,
      params,
    );

    const map = new Map<string, number>();
    for (const row of result.rows) {
      map.set(row.purchase_order_item_id, Number(row.consumed));
    }
    return map;
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<GoodsReceipt> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM goods_receipts
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('GOODS_RECEIPT.NOT_FOUND');
      }
      const from = headerResult.rows[0].status as GoodsReceiptStatus;
      if (!canTransition(from, 'CANCELLED')) {
        throw new InvariantError('GOODS_RECEIPT.INVALID_STATUS_TRANSITION');
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE goods_receipts
         SET status = 'CANCELLED', updated_by = $1, updated_at = NOW(),
             deleted_at = NOW(), deleted_by = $1
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, id, companyId],
      );

      await this._insertLog(client, id, from, 'CANCELLED', userId, note);

      const items = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toGoodsReceipt(updated.rows[0], items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Map a unique-violation on gr_number to a friendly conflict. */
  private _translateConflict(err: unknown): unknown {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return new InvariantError('GOODS_RECEIPT.NUMBER_ALREADY_USED');
    }
    return err;
  }
}
