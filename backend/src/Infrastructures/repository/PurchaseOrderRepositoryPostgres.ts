import { Pool, PoolClient } from 'pg';
import {
  PurchaseOrderRepository,
  NewPurchaseOrderData,
  PurchaseOrderListFilter,
  PurchaseOrderListResult,
} from '../../Domains/purchase-orders/PurchaseOrderRepository';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatusLog,
} from '../../Domains/purchase-orders/entities/PurchaseOrder';
import {
  PurchaseOrderStatus,
  canTransition,
  isEditableStatus,
} from '../../Domains/purchase-orders/purchaseOrderStatus';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';

interface HeaderRow {
  id: string;
  company_id: string;
  po_number: string;
  purchase_request_id: string;
  supplier_id: string;
  destination_outlet_id: string;
  order_date: Date;
  payment_term_id: string | null;
  payment_term_code: string | null;
  payment_term_name: string | null;
  payment_term_due_days: number | null;
  estimated_payment_due_date: Date | null;
  total_amount: string;
  tax_total: string;
  grand_total: string;
  status: string;
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
  product_id: string;
  quantity: string;
  uom_id: string;
  unit_price: string;
  tax_percent: string;
  subtotal: string;
  tax_amount: string;
  total: string;
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

const HEADER_COLUMNS = `id, company_id, po_number, purchase_request_id, supplier_id,
  destination_outlet_id, order_date, payment_term_id, payment_term_code,
  payment_term_name, payment_term_due_days, estimated_payment_due_date,
  total_amount, tax_total, grand_total, status, notes, approved_by, approved_at,
  created_by, updated_by, created_at, updated_at`;
const ITEM_COLUMNS = `id, product_id, quantity, uom_id, unit_price, tax_percent,
  subtotal, tax_amount, total`;

/**
 * Status-log columns with the actor name resolved via LEFT JOIN to users.
 * `actor_name` is null when the actor user was removed.
 */
const LOG_SELECT = `SELECT l.id, l.from_status, l.to_status, l.actor_id,
    actor_users.name AS actor_name, l.note, l.created_at
  FROM purchase_order_status_logs l
  LEFT JOIN users actor_users ON actor_users.id = l.actor_id`;

/**
 * Concrete PostgreSQL implementation of PurchaseOrderRepository.
 *
 * Raw SQL, company-scoped. Create-with-items and every status transition run in
 * a transaction, and each transition writes a purchase_order_status_logs row
 * atomically with the header change so the timeline never drifts.
 */
export class PurchaseOrderRepositoryPostgres extends PurchaseOrderRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toItem(row: ItemRow): PurchaseOrderItem {
    return {
      id: row.id,
      productId: row.product_id,
      quantity: Number(row.quantity),
      uomId: row.uom_id,
      unitPrice: Number(row.unit_price),
      taxPercent: Number(row.tax_percent),
      subtotal: Number(row.subtotal),
      taxAmount: Number(row.tax_amount),
      total: Number(row.total),
    };
  }

  private _toLog(row: LogRow): PurchaseOrderStatusLog {
    return {
      id: row.id,
      fromStatus: (row.from_status as PurchaseOrderStatus) ?? null,
      toStatus: row.to_status as PurchaseOrderStatus,
      actorId: row.actor_id,
      actorName: row.actor_name,
      note: row.note,
      createdAt: row.created_at,
    };
  }

  private _toPurchaseOrder(
    header: HeaderRow,
    items: ItemRow[],
    logs: LogRow[],
  ): PurchaseOrder {
    return new PurchaseOrder({
      id: header.id,
      companyId: header.company_id,
      poNumber: header.po_number,
      purchaseRequestId: header.purchase_request_id,
      supplierId: header.supplier_id,
      destinationOutletId: header.destination_outlet_id,
      orderDate: header.order_date,
      paymentTermId: header.payment_term_id,
      paymentTermCode: header.payment_term_code,
      paymentTermName: header.payment_term_name,
      paymentTermDueDays:
        header.payment_term_due_days === null ? null : Number(header.payment_term_due_days),
      estimatedPaymentDueDate: header.estimated_payment_due_date,
      totalAmount: Number(header.total_amount),
      taxTotal: Number(header.tax_total),
      grandTotal: Number(header.grand_total),
      status: header.status as PurchaseOrderStatus,
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
   * Generate a PO number `PO-{outletCode}-YYYY-NNNNNN`, per company, per year,
   * per destination outlet code. Serial is derived from the current max serial
   * for that (company, outlet-code, year) prefix. Called inside the create
   * transaction; a duplicate would still be caught by the partial unique index.
   */
  private async _generateNumber(
    client: PoolClient,
    companyId: string,
    outletCode: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${outletCode}-${year}-`;
    const result = await client.query<{ max_serial: string | null }>(
      `SELECT MAX(CAST(RIGHT(po_number, 6) AS INTEGER)) AS max_serial
       FROM purchase_orders
       WHERE company_id = $1 AND po_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const current = result.rows[0]?.max_serial ? parseInt(result.rows[0].max_serial, 10) : 0;
    const seq = current + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _loadItems(client: PoolClient, poId: string): Promise<ItemRow[]> {
    const result = await client.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM purchase_order_items
       WHERE purchase_order_id = $1 ORDER BY created_at ASC, id ASC`,
      [poId],
    );
    return result.rows;
  }

  private async _loadLogs(client: PoolClient, poId: string): Promise<LogRow[]> {
    const result = await client.query<LogRow>(
      `${LOG_SELECT}
       WHERE l.purchase_order_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
      [poId],
    );
    return result.rows;
  }

  private async _insertItems(
    client: PoolClient,
    poId: string,
    items: NewPurchaseOrderData['items'],
  ): Promise<void> {
    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_order_items
           (purchase_order_id, product_id, quantity, uom_id, unit_price,
            tax_percent, subtotal, tax_amount, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          poId,
          item.productId,
          item.quantity,
          item.uomId,
          item.unitPrice,
          item.taxPercent,
          item.subtotal,
          item.taxAmount,
          item.total,
        ],
      );
    }
  }

  private async _insertLog(
    client: PoolClient,
    poId: string,
    fromStatus: PurchaseOrderStatus | null,
    toStatus: PurchaseOrderStatus,
    actorId: string | null,
    note: string | null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO purchase_order_status_logs
         (purchase_order_id, from_status, to_status, actor_id, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [poId, fromStatus, toStatus, actorId, note],
    );
  }

  private async _resolveOutletCode(
    client: PoolClient,
    outletId: string,
    companyId: string,
  ): Promise<string> {
    const result = await client.query<{ code: string }>(
      `SELECT code FROM outlets WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [outletId, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('OUTLET.NOT_FOUND');
    }
    return result.rows[0].code;
  }

  async createDraft(
    companyId: string,
    userId: string | null,
    data: NewPurchaseOrderData,
  ): Promise<PurchaseOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const outletCode = await this._resolveOutletCode(
        client,
        data.destinationOutletId,
        companyId,
      );
      const number = await this._generateNumber(client, companyId, outletCode);

      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO purchase_orders
           (company_id, po_number, purchase_request_id, supplier_id, destination_outlet_id,
            order_date, payment_term_id, payment_term_code, payment_term_name,
            payment_term_due_days, estimated_payment_due_date, total_amount, tax_total,
            grand_total, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10,$11::date,$12,$13,$14,'DRAFT',$15,$16)
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          number,
          data.purchaseRequestId,
          data.supplierId,
          data.destinationOutletId,
          data.orderDate,
          data.paymentTermId,
          data.paymentTermCode,
          data.paymentTermName,
          data.paymentTermDueDays,
          data.estimatedPaymentDueDate,
          data.totalAmount,
          data.taxTotal,
          data.grandTotal,
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
      return this._toPurchaseOrder(header, items, logs);
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
    data: NewPurchaseOrderData,
  ): Promise<PurchaseOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM purchase_orders
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PURCHASE_ORDER.NOT_FOUND');
      }
      const current = headerResult.rows[0].status as PurchaseOrderStatus;
      if (!isEditableStatus(current)) {
        throw new InvariantError('PURCHASE_ORDER.ONLY_EDITABLE_STATUS');
      }

      // Editing always lands the document back in DRAFT; if it was REJECTED,
      // record the REJECTED -> DRAFT transition on the timeline.
      const updatedHeader = await client.query<HeaderRow>(
        `UPDATE purchase_orders
         SET purchase_request_id = $1, supplier_id = $2, destination_outlet_id = $3,
             order_date = $4::date, payment_term_id = $5, payment_term_code = $6,
             payment_term_name = $7, payment_term_due_days = $8,
             estimated_payment_due_date = $9::date, total_amount = $10, tax_total = $11,
             grand_total = $12, notes = $13, status = 'DRAFT', updated_by = $14,
             updated_at = NOW()
         WHERE id = $15 AND company_id = $16
         RETURNING ${HEADER_COLUMNS}`,
        [
          data.purchaseRequestId,
          data.supplierId,
          data.destinationOutletId,
          data.orderDate,
          data.paymentTermId,
          data.paymentTermCode,
          data.paymentTermName,
          data.paymentTermDueDays,
          data.estimatedPaymentDueDate,
          data.totalAmount,
          data.taxTotal,
          data.grandTotal,
          data.notes,
          userId,
          id,
          companyId,
        ],
      );

      await client.query(`DELETE FROM purchase_order_items WHERE purchase_order_id = $1`, [id]);
      await this._insertItems(client, id, data.items);

      if (current === 'REJECTED') {
        await this._insertLog(
          client,
          id,
          'REJECTED',
          'DRAFT',
          userId,
          'Diperbarui dan dikembalikan ke draft',
        );
      }

      const items = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toPurchaseOrder(updatedHeader.rows[0], items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw this._translateConflict(err);
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<PurchaseOrder> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM purchase_orders
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('PURCHASE_ORDER.NOT_FOUND');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM purchase_order_items
       WHERE purchase_order_id = $1 ORDER BY created_at ASC, id ASC`,
      [id],
    );
    const logsResult = await this.pool.query<LogRow>(
      `${LOG_SELECT}
       WHERE l.purchase_order_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
      [id],
    );
    return this._toPurchaseOrder(headerResult.rows[0], itemsResult.rows, logsResult.rows);
  }

  async list(
    companyId: string,
    filter: PurchaseOrderListFilter,
  ): Promise<PurchaseOrderListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filter.supplierId) {
      params.push(filter.supplierId);
      conditions.push(`supplier_id = $${params.length}`);
    }
    if (filter.destinationOutletId) {
      params.push(filter.destinationOutletId);
      conditions.push(`destination_outlet_id = $${params.length}`);
    }
    if (filter.purchaseRequestId) {
      params.push(filter.purchaseRequestId);
      conditions.push(`purchase_request_id = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(po_number ILIKE $${params.length} OR notes ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM purchase_orders WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM purchase_orders
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const rows: PurchaseOrder[] = [];
    for (const header of headerResult.rows) {
      const itemsResult = await this.pool.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM purchase_order_items
         WHERE purchase_order_id = $1 ORDER BY created_at ASC, id ASC`,
        [header.id],
      );
      const logsResult = await this.pool.query<LogRow>(
        `${LOG_SELECT}
         WHERE l.purchase_order_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
        [header.id],
      );
      rows.push(this._toPurchaseOrder(header, itemsResult.rows, logsResult.rows));
    }

    return { rows, total };
  }

  /**
   * Generic guarded status transition + timeline log. Loads the header FOR
   * UPDATE, verifies canTransition, applies the extra column sets, writes a log
   * row, commits — all atomically.
   */
  private async _transition(
    id: string,
    companyId: string,
    userId: string | null,
    to: PurchaseOrderStatus,
    note: string | null,
    extraSets: string[] = [],
    softDelete = false,
  ): Promise<PurchaseOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM purchase_orders
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PURCHASE_ORDER.NOT_FOUND');
      }
      const from = headerResult.rows[0].status as PurchaseOrderStatus;
      if (!canTransition(from, to)) {
        throw new InvariantError('PURCHASE_ORDER.INVALID_STATUS_TRANSITION');
      }

      const sets = ['status = $1', 'updated_by = $2', 'updated_at = NOW()', ...extraSets];
      if (softDelete) {
        sets.push('deleted_at = NOW()', 'deleted_by = $2');
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE purchase_orders SET ${sets.join(', ')}
         WHERE id = $3 AND company_id = $4
         RETURNING ${HEADER_COLUMNS}`,
        [to, userId, id, companyId],
      );

      await this._insertLog(client, id, from, to, userId, note);

      const items = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toPurchaseOrder(updated.rows[0], items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async submit(id: string, companyId: string, userId: string | null): Promise<PurchaseOrder> {
    return this._transition(id, companyId, userId, 'SUBMITTED', null);
  }

  async approve(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder> {
    return this._transition(id, companyId, userId, 'APPROVED', note, [
      'approved_by = $2',
      'approved_at = NOW()',
    ]);
  }

  async reject(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder> {
    return this._transition(id, companyId, userId, 'REJECTED', note);
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder> {
    return this._transition(id, companyId, userId, 'CANCELLED', note, [], true);
  }

  /** Map a unique-violation on po_number to a friendly conflict. */
  private _translateConflict(err: unknown): unknown {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return new InvariantError('PURCHASE_ORDER.NUMBER_ALREADY_USED');
    }
    return err;
  }
}
