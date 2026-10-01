import { Pool, PoolClient } from 'pg';
import {
  PurchaseOrderRepository,
  NewPurchaseOrderData,
  NewPurchaseOrderCommentData,
  NewPurchaseOrderAttachmentData,
  PurchaseOrderListFilter,
  PurchaseOrderListResult,
} from '../../Domains/purchase-orders/PurchaseOrderRepository';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatusLog,
} from '../../Domains/purchase-orders/entities/PurchaseOrder';
import { PurchaseOrderComment } from '../../Domains/purchase-orders/entities/PurchaseOrderComment';
import {
  PurchaseOrderAttachment,
  PurchaseOrderAttachmentWithPath,
} from '../../Domains/purchase-orders/entities/PurchaseOrderAttachment';
import { PurchaseOrderCommentCategory } from '../../Domains/purchase-orders/purchaseOrderCommentCategory';
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

interface CommentRow {
  id: string;
  category: string;
  body: string;
  author_id: string | null;
  author_name: string | null;
  created_at: Date;
}

interface AttachmentRow {
  id: string;
  original_name: string;
  stored_path: string;
  mime_type: string;
  size_bytes: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
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

/** Comment columns with author name resolved via LEFT JOIN to users. */
const COMMENT_SELECT = `SELECT c.id, c.category, c.body, c.author_id,
    author_users.name AS author_name, c.created_at
  FROM purchase_order_comments c
  LEFT JOIN users author_users ON author_users.id = c.author_id`;

/** Attachment columns with uploader name resolved via LEFT JOIN to users. */
const ATTACHMENT_SELECT = `SELECT a.id, a.original_name, a.stored_path, a.mime_type,
    a.size_bytes, a.uploaded_by, uploader_users.name AS uploaded_by_name, a.created_at
  FROM purchase_order_attachments a
  LEFT JOIN users uploader_users ON uploader_users.id = a.uploaded_by`;

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

  private _toComment(row: CommentRow): PurchaseOrderComment {
    return {
      id: row.id,
      category: row.category as PurchaseOrderCommentCategory,
      body: row.body,
      authorId: row.author_id,
      authorName: row.author_name,
      createdAt: row.created_at,
    };
  }

  private _toAttachment(row: AttachmentRow): PurchaseOrderAttachmentWithPath {
    return {
      id: row.id,
      originalName: row.original_name,
      storedPath: row.stored_path,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      uploadedBy: row.uploaded_by,
      uploadedByName: row.uploaded_by_name,
      createdAt: row.created_at,
    };
  }

  /** Drop the internal storedPath before returning metadata to callers. */
  private _stripPath(
    attachment: PurchaseOrderAttachmentWithPath,
  ): PurchaseOrderAttachment {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { storedPath, ...metadata } = attachment;
    return metadata;
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

  async ensureExists(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT 1 FROM purchase_orders
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('PURCHASE_ORDER.NOT_FOUND');
    }
  }

  async addComment(
    purchaseOrderId: string,
    companyId: string,
    authorId: string | null,
    data: NewPurchaseOrderCommentData,
  ): Promise<PurchaseOrderComment> {
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO purchase_order_comments
         (purchase_order_id, company_id, author_id, category, body)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [purchaseOrderId, companyId, authorId, data.category, data.body],
    );
    const result = await this.pool.query<CommentRow>(
      `${COMMENT_SELECT} WHERE c.id = $1`,
      [inserted.rows[0].id],
    );
    return this._toComment(result.rows[0]);
  }

  async listComments(
    purchaseOrderId: string,
    companyId: string,
  ): Promise<PurchaseOrderComment[]> {
    const result = await this.pool.query<CommentRow>(
      `${COMMENT_SELECT}
       WHERE c.purchase_order_id = $1 AND c.company_id = $2
       ORDER BY c.created_at ASC, c.id ASC`,
      [purchaseOrderId, companyId],
    );
    return result.rows.map((row) => this._toComment(row));
  }

  async addAttachment(
    purchaseOrderId: string,
    companyId: string,
    uploadedBy: string | null,
    data: NewPurchaseOrderAttachmentData,
  ): Promise<PurchaseOrderAttachment> {
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO purchase_order_attachments
         (purchase_order_id, company_id, original_name, stored_path, mime_type, size_bytes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        purchaseOrderId,
        companyId,
        data.originalName,
        data.storedPath,
        data.mimeType,
        data.sizeBytes,
        uploadedBy,
      ],
    );
    const result = await this.pool.query<AttachmentRow>(
      `${ATTACHMENT_SELECT} WHERE a.id = $1`,
      [inserted.rows[0].id],
    );
    return this._stripPath(this._toAttachment(result.rows[0]));
  }

  async listAttachments(
    purchaseOrderId: string,
    companyId: string,
  ): Promise<PurchaseOrderAttachment[]> {
    const result = await this.pool.query<AttachmentRow>(
      `${ATTACHMENT_SELECT}
       WHERE a.purchase_order_id = $1 AND a.company_id = $2
       ORDER BY a.created_at ASC, a.id ASC`,
      [purchaseOrderId, companyId],
    );
    return result.rows.map((row) => this._stripPath(this._toAttachment(row)));
  }

  async getAttachmentById(
    purchaseOrderId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseOrderAttachmentWithPath> {
    const result = await this.pool.query<AttachmentRow>(
      `${ATTACHMENT_SELECT}
       WHERE a.id = $1 AND a.purchase_order_id = $2 AND a.company_id = $3`,
      [attachmentId, purchaseOrderId, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('PURCHASE_ORDER_ATTACHMENT.NOT_FOUND');
    }
    return this._toAttachment(result.rows[0]);
  }

  async deleteAttachment(
    purchaseOrderId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseOrderAttachmentWithPath> {
    const result = await this.pool.query<AttachmentRow>(
      `DELETE FROM purchase_order_attachments a
       WHERE a.id = $1 AND a.purchase_order_id = $2 AND a.company_id = $3
       RETURNING a.id, a.original_name, a.stored_path, a.mime_type,
         a.size_bytes, a.uploaded_by, NULL AS uploaded_by_name, a.created_at`,
      [attachmentId, purchaseOrderId, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('PURCHASE_ORDER_ATTACHMENT.NOT_FOUND');
    }
    return this._toAttachment(result.rows[0]);
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
