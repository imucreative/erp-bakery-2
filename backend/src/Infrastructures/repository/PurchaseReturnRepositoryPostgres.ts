import { Pool, PoolClient } from 'pg';
import {
  PurchaseReturnRepository,
  NewPurchaseReturnData,
  NewPurchaseReturnCommentData,
  NewPurchaseReturnAttachmentData,
  PurchaseReturnListFilter,
  PurchaseReturnListResult,
  ReturnableLine,
} from '../../Domains/purchase-returns/PurchaseReturnRepository';
import {
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnStatusLog,
} from '../../Domains/purchase-returns/entities/PurchaseReturn';
import { PurchaseReturnComment } from '../../Domains/purchase-returns/entities/PurchaseReturnComment';
import {
  PurchaseReturnAttachment,
  PurchaseReturnAttachmentWithPath,
} from '../../Domains/purchase-returns/entities/PurchaseReturnAttachment';
import { PurchaseReturnCommentCategory } from '../../Domains/purchase-returns/purchaseReturnCommentCategory';
import {
  PurchaseReturnStatus,
  canTransition,
  isEditableStatus,
} from '../../Domains/purchase-returns/returnStatus';
import { PurchaseReturnReason } from '../../Domains/purchase-returns/returnReason';
import { deriveReturnableQuantity } from '../../Domains/purchase-returns/entities/CreatePurchaseReturn';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';
import { translateDuplicateSourceKey } from './helpers/inventoryPosting';

interface HeaderRow {
  id: string;
  company_id: string;
  return_number: string;
  goods_receipt_id: string;
  purchase_order_id: string;
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  outlet_id: string;
  outlet_code: string;
  outlet_name: string;
  return_date: Date;
  status: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  submitted_by: string | null;
  completed_by: string | null;
  cancelled_by: string | null;
  submitted_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  goods_receipt_item_id: string;
  source_batch_id: string;
  source_movement_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  uom_id: string;
  uom_code: string;
  uom_name: string | null;
  batch_number: string | null;
  lot_number: string | null;
  expired_date: Date | null;
  posted_accepted_quantity: string;
  previously_returned_quantity: string;
  return_quantity: string;
  reason: string;
  reason_description: string | null;
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

const HEADER_COLUMNS = `id, company_id, return_number, goods_receipt_id, purchase_order_id,
  supplier_id, supplier_code, supplier_name, outlet_id, outlet_code, outlet_name,
  return_date, status, notes, created_by, updated_by, submitted_by, completed_by,
  cancelled_by, submitted_at, completed_at, cancelled_at, created_at, updated_at`;
const ITEM_COLUMNS = `id, goods_receipt_item_id, source_batch_id, source_movement_id,
  product_id, product_sku, product_name, uom_id, uom_code, uom_name, batch_number, lot_number,
  expired_date, posted_accepted_quantity, previously_returned_quantity, return_quantity,
  reason, reason_description`;

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

/**
 * Status-log columns with the actor name resolved via LEFT JOIN to users.
 */
const LOG_SELECT = `SELECT l.id, l.from_status, l.to_status, l.actor_id,
    actor_users.name AS actor_name, l.note, l.created_at
  FROM purchase_return_status_logs l
  LEFT JOIN users actor_users ON actor_users.id = l.actor_id`;

/** Comment columns with author name resolved via LEFT JOIN to users. */
const COMMENT_SELECT = `SELECT c.id, c.category, c.body, c.author_id,
    author_users.name AS author_name, c.created_at
  FROM purchase_return_comments c
  LEFT JOIN users author_users ON author_users.id = c.author_id`;

/** Attachment columns with uploader name resolved via LEFT JOIN to users. */
const ATTACHMENT_SELECT = `SELECT a.id, a.original_name, a.stored_path, a.mime_type,
    a.size_bytes, a.uploaded_by, uploader_users.name AS uploaded_by_name, a.created_at
  FROM purchase_return_attachments a
  LEFT JOIN users uploader_users ON uploader_users.id = a.uploaded_by`;

/**
 * Concrete PostgreSQL implementation of PurchaseReturnRepository.
 *
 * Raw SQL, company-scoped. createDraft/updateDraft/submit/cancel run in plain
 * transactions; complete runs SERIALIZABLE and posts the RETURN inventory
 * reversal atomically with the balance change and the status log. Each status
 * transition writes a purchase_return_status_logs row in the same transaction
 * so the timeline never drifts.
 *
 * Returnable is DERIVED from the posted accepted PURCHASE inventory movements of
 * the source Goods Receipt (doc 26 §6 #14–#16), minus COMPLETED and SUBMITTED
 * return quantities. It is never read from the GR item snapshot alone.
 */
export class PurchaseReturnRepositoryPostgres extends PurchaseReturnRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toItem(row: ItemRow): PurchaseReturnItem {
    return {
      id: row.id,
      goodsReceiptItemId: row.goods_receipt_item_id,
      sourceBatchId: row.source_batch_id,
      sourceMovementId: row.source_movement_id,
      productId: row.product_id,
      productSku: row.product_sku,
      productName: row.product_name,
      uomId: row.uom_id,
      uomCode: row.uom_code,
      uomName: row.uom_name ?? '',
      batchNumber: row.batch_number,
      lotNumber: row.lot_number,
      expiredDate: row.expired_date,
      postedAcceptedQuantity: Number(row.posted_accepted_quantity),
      previouslyReturnedQuantity: Number(row.previously_returned_quantity),
      returnQuantity: Number(row.return_quantity),
      reason: row.reason as PurchaseReturnReason,
      reasonDescription: row.reason_description,
    };
  }

  private _toLog(row: LogRow): PurchaseReturnStatusLog {
    return {
      id: row.id,
      fromStatus: (row.from_status as PurchaseReturnStatus) ?? null,
      toStatus: row.to_status as PurchaseReturnStatus,
      actorId: row.actor_id,
      actorName: row.actor_name,
      note: row.note,
      createdAt: row.created_at,
    };
  }

  private _toComment(row: CommentRow): PurchaseReturnComment {
    return {
      id: row.id,
      category: row.category as PurchaseReturnCommentCategory,
      body: row.body,
      authorId: row.author_id,
      authorName: row.author_name,
      createdAt: row.created_at,
    };
  }

  private _toAttachment(row: AttachmentRow): PurchaseReturnAttachmentWithPath {
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
    attachment: PurchaseReturnAttachmentWithPath,
  ): PurchaseReturnAttachment {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { storedPath, ...metadata } = attachment;
    return metadata;
  }

  private _toPurchaseReturn(
    header: HeaderRow,
    items: ItemRow[],
    logs: LogRow[],
  ): PurchaseReturn {
    return new PurchaseReturn({
      id: header.id,
      companyId: header.company_id,
      returnNumber: header.return_number,
      goodsReceiptId: header.goods_receipt_id,
      purchaseOrderId: header.purchase_order_id,
      supplierId: header.supplier_id,
      supplierCode: header.supplier_code,
      supplierName: header.supplier_name,
      outletId: header.outlet_id,
      outletCode: header.outlet_code,
      outletName: header.outlet_name,
      returnDate: header.return_date,
      status: header.status as PurchaseReturnStatus,
      notes: header.notes,
      items: items.map((i) => this._toItem(i)),
      statusLogs: logs.map((l) => this._toLog(l)),
      createdBy: header.created_by,
      updatedBy: header.updated_by,
      submittedBy: header.submitted_by,
      completedBy: header.completed_by,
      cancelledBy: header.cancelled_by,
      submittedAt: header.submitted_at,
      completedAt: header.completed_at,
      cancelledAt: header.cancelled_at,
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  /**
   * Generate a return number `RTN-YYYY-NNNNNN`, per company, per year
   * (doc 35 §2 — no outlet code). Serial is derived from the current max serial
   * for that (company, year) prefix; the partial unique index is the final guard
   * against a race.
   */
  private async _generateNumber(client: PoolClient, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RTN-${year}-`;
    const result = await client.query<{ max_serial: string | null }>(
      `SELECT MAX(CAST(RIGHT(return_number, 6) AS INTEGER)) AS max_serial
       FROM purchase_returns
       WHERE company_id = $1 AND return_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const current = result.rows[0]?.max_serial ? parseInt(result.rows[0].max_serial, 10) : 0;
    const seq = current + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _loadItems(client: PoolClient, returnId: string): Promise<ItemRow[]> {
    const result = await client.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM purchase_return_items
       WHERE purchase_return_id = $1 ORDER BY created_at ASC, id ASC`,
      [returnId],
    );
    return result.rows;
  }

  private async _loadLogs(client: PoolClient, returnId: string): Promise<LogRow[]> {
    const result = await client.query<LogRow>(
      `${LOG_SELECT}
       WHERE l.purchase_return_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
      [returnId],
    );
    return result.rows;
  }

  private async _insertItems(
    client: PoolClient,
    returnId: string,
    items: NewPurchaseReturnData['items'],
  ): Promise<void> {
    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_return_items
           (purchase_return_id, goods_receipt_item_id, source_batch_id, source_movement_id,
            product_id, product_sku, product_name, uom_id, uom_code, uom_name, batch_number,
            lot_number, expired_date, posted_accepted_quantity, previously_returned_quantity,
            return_quantity, reason, reason_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::date,$14,$15,$16,$17,$18)`,
        [
          returnId,
          item.goodsReceiptItemId,
          item.sourceBatchId,
          item.sourceMovementId,
          item.productId,
          item.productSku,
          item.productName,
          item.uomId,
          item.uomCode,
          item.uomName,
          item.batchNumber,
          item.lotNumber,
          item.expiredDate,
          item.postedAcceptedQuantity,
          item.previouslyReturnedQuantity,
          item.returnQuantity,
          item.reason,
          item.reasonDescription,
        ],
      );
    }
  }

  private async _insertLog(
    client: PoolClient,
    returnId: string,
    fromStatus: PurchaseReturnStatus | null,
    toStatus: PurchaseReturnStatus,
    actorId: string | null,
    note: string | null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO purchase_return_status_logs
         (purchase_return_id, from_status, to_status, actor_id, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [returnId, fromStatus, toStatus, actorId, note],
    );
  }

  async createDraft(
    companyId: string,
    userId: string | null,
    data: NewPurchaseReturnData,
  ): Promise<PurchaseReturn> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const number = await this._generateNumber(client, companyId);

      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO purchase_returns
           (company_id, return_number, goods_receipt_id, purchase_order_id,
            supplier_id, supplier_code, supplier_name, outlet_id, outlet_code, outlet_name,
            return_date, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,'DRAFT',$12,$13)
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          number,
          data.goodsReceiptId,
          data.purchaseOrderId,
          data.supplierId,
          data.supplierCode,
          data.supplierName,
          data.outletId,
          data.outletCode,
          data.outletName,
          data.returnDate,
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
      return this._toPurchaseReturn(header, items, logs);
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
    data: NewPurchaseReturnData,
  ): Promise<PurchaseReturn> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM purchase_returns
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PURCHASE_RETURN.NOT_FOUND');
      }
      const current = headerResult.rows[0].status as PurchaseReturnStatus;
      if (!isEditableStatus(current)) {
        throw new InvariantError('PURCHASE_RETURN.ONLY_EDITABLE_STATUS');
      }

      const updatedHeader = await client.query<HeaderRow>(
        `UPDATE purchase_returns
         SET goods_receipt_id = $1, purchase_order_id = $2,
             supplier_id = $3, supplier_code = $4, supplier_name = $5,
             outlet_id = $6, outlet_code = $7, outlet_name = $8,
             return_date = $9::date, notes = $10, updated_by = $11, updated_at = NOW()
         WHERE id = $12 AND company_id = $13
         RETURNING ${HEADER_COLUMNS}`,
        [
          data.goodsReceiptId,
          data.purchaseOrderId,
          data.supplierId,
          data.supplierCode,
          data.supplierName,
          data.outletId,
          data.outletCode,
          data.outletName,
          data.returnDate,
          data.notes,
          userId,
          id,
          companyId,
        ],
      );

      await client.query(`DELETE FROM purchase_return_items WHERE purchase_return_id = $1`, [id]);
      await this._insertItems(client, id, data.items);

      const items = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toPurchaseReturn(updatedHeader.rows[0], items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw this._translateConflict(err);
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<PurchaseReturn> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM purchase_returns
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('PURCHASE_RETURN.NOT_FOUND');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM purchase_return_items
       WHERE purchase_return_id = $1 ORDER BY created_at ASC, id ASC`,
      [id],
    );
    const logsResult = await this.pool.query<LogRow>(
      `${LOG_SELECT}
       WHERE l.purchase_return_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
      [id],
    );
    return this._toPurchaseReturn(headerResult.rows[0], itemsResult.rows, logsResult.rows);
  }

  async list(
    companyId: string,
    filter: PurchaseReturnListFilter,
  ): Promise<PurchaseReturnListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filter.goodsReceiptId) {
      params.push(filter.goodsReceiptId);
      conditions.push(`goods_receipt_id = $${params.length}`);
    }
    if (filter.supplierId) {
      params.push(filter.supplierId);
      conditions.push(`supplier_id = $${params.length}`);
    }
    if (filter.outletId) {
      params.push(filter.outletId);
      conditions.push(`outlet_id = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(return_number ILIKE $${params.length} OR notes ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM purchase_returns WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM purchase_returns
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const rows: PurchaseReturn[] = [];
    for (const header of headerResult.rows) {
      const itemsResult = await this.pool.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM purchase_return_items
         WHERE purchase_return_id = $1 ORDER BY created_at ASC, id ASC`,
        [header.id],
      );
      const logsResult = await this.pool.query<LogRow>(
        `${LOG_SELECT}
         WHERE l.purchase_return_id = $1 ORDER BY l.created_at ASC, l.id ASC`,
        [header.id],
      );
      rows.push(this._toPurchaseReturn(header, itemsResult.rows, logsResult.rows));
    }

    return { rows, total };
  }

  /**
   * Sum of return_quantity per goods_receipt_item_id across purchase_return_items
   * whose parent return has one of the given statuses (company-scoped). Used to
   * derive completed + submitted reservations. `excludeReturnId` leaves a
   * return's own lines out (so submit does not count itself).
   */
  private async _sumReturnedByGrItem(
    client: Pool | PoolClient,
    companyId: string,
    goodsReceiptId: string,
    statuses: PurchaseReturnStatus[],
    excludeReturnId?: string,
  ): Promise<Map<string, number>> {
    const params: unknown[] = [companyId, goodsReceiptId, statuses];
    let excludeClause = '';
    if (excludeReturnId) {
      params.push(excludeReturnId);
      excludeClause = ` AND pr.id <> $${params.length}`;
    }

    const result = await client.query<{ goods_receipt_item_id: string; total: string }>(
      `SELECT pri.goods_receipt_item_id AS goods_receipt_item_id,
              SUM(pri.return_quantity) AS total
       FROM purchase_return_items pri
       JOIN purchase_returns pr ON pr.id = pri.purchase_return_id
       WHERE pr.company_id = $1
         AND pr.goods_receipt_id = $2
         AND pr.status = ANY($3::varchar[])
         AND pr.deleted_at IS NULL${excludeClause}
       GROUP BY pri.goods_receipt_item_id`,
      params,
    );

    const map = new Map<string, number>();
    for (const row of result.rows) {
      map.set(row.goods_receipt_item_id, Number(row.total));
    }
    return map;
  }

  async getReturnable(
    goodsReceiptId: string,
    companyId: string,
  ): Promise<ReturnableLine[]> {
    // 1. Source GR must exist in the company and be COMPLETED (its accepted
    // quantities were posted to inventory as PURCHASE movements).
    const grResult = await this.pool.query<{ status: string }>(
      `SELECT status FROM goods_receipts
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [goodsReceiptId, companyId],
    );
    if (!grResult.rowCount) {
      throw new NotFoundError('GOODS_RECEIPT.NOT_FOUND');
    }
    if (grResult.rows[0].status !== 'COMPLETED') {
      throw new InvariantError('PURCHASE_RETURN.GOODS_RECEIPT_NOT_COMPLETED');
    }

    // 2. Posted accepted PURCHASE movements of the GR are the authoritative
    // source of returnable (doc 26 §6 #14–#16). One PURCHASE movement per GR
    // item; it carries the credited batch (batch_id) and is the reversal
    // reference. JOIN the GR item + product + uom + batch for the snapshots.
    const movementResult = await this.pool.query<{
      movement_id: string;
      posted_qty: string;
      batch_id: string;
      goods_receipt_item_id: string;
      product_id: string;
      product_sku: string;
      product_name: string;
      uom_id: string;
      uom_code: string;
      uom_name: string;
      batch_number: string | null;
      lot_number: string | null;
      expired_date: Date | null;
    }>(
      `SELECT m.id AS movement_id, m.qty AS posted_qty, m.batch_id AS batch_id,
              m.source_document_item_id AS goods_receipt_item_id,
              m.product_id AS product_id,
              p.sku AS product_sku, p.name AS product_name,
              u.id AS uom_id, u.code AS uom_code, u.name AS uom_name,
              b.batch_number AS batch_number, b.lot_number AS lot_number,
              b.expired_date AS expired_date
       FROM inventory_movements m
       JOIN products p ON p.id = m.product_id
       JOIN uoms u ON u.id = p.uom_id
       JOIN inventory_batches b ON b.id = m.batch_id
       WHERE m.company_id = $1
         AND m.movement_type = 'PURCHASE'
         AND m.source_document_type = 'GOODS_RECEIPT'
         AND m.source_document_id = $2
       ORDER BY m.created_at ASC, m.id ASC`,
      [companyId, goodsReceiptId],
    );

    // 3. Completed + submitted returned quantities per GR item (reservation).
    const completedMap = await this._sumReturnedByGrItem(
      this.pool,
      companyId,
      goodsReceiptId,
      ['COMPLETED'],
    );
    const submittedMap = await this._sumReturnedByGrItem(
      this.pool,
      companyId,
      goodsReceiptId,
      ['SUBMITTED'],
    );

    return movementResult.rows.map((row) => {
      const grItemId = row.goods_receipt_item_id;
      const postedAcceptedQuantity = Number(row.posted_qty);
      const completedReturnQuantity = completedMap.get(grItemId) ?? 0;
      const submittedReturnQuantity = submittedMap.get(grItemId) ?? 0;
      const returnableQuantity = deriveReturnableQuantity({
        postedAcceptedQuantity,
        completedReturnQuantity,
        submittedReturnQuantity,
      });
      return {
        goodsReceiptItemId: grItemId,
        sourceBatchId: row.batch_id,
        sourceMovementId: row.movement_id,
        productId: row.product_id,
        productSku: row.product_sku,
        productName: row.product_name,
        uomId: row.uom_id,
        uomCode: row.uom_code,
        uomName: row.uom_name,
        batchNumber: row.batch_number,
        lotNumber: row.lot_number,
        expiredDate: row.expired_date,
        postedAcceptedQuantity,
        completedReturnQuantity,
        submittedReturnQuantity,
        returnableQuantity,
      };
    });
  }

  /**
   * Re-derive the returnable quantity per GR item for a return's own lines,
   * authoritatively, EXCLUDING this return from the submitted reservation sum.
   * Used by submit + complete to reject lines whose returnQuantity exceeds the
   * currently returnable quantity. Keyed by goods_receipt_item_id.
   */
  private async _deriveReturnableForReturn(
    client: PoolClient,
    companyId: string,
    goodsReceiptId: string,
    returnId: string,
  ): Promise<Map<string, number>> {
    const movementResult = await client.query<{
      goods_receipt_item_id: string;
      posted_qty: string;
    }>(
      `SELECT m.source_document_item_id AS goods_receipt_item_id, m.qty AS posted_qty
       FROM inventory_movements m
       WHERE m.company_id = $1
         AND m.movement_type = 'PURCHASE'
         AND m.source_document_type = 'GOODS_RECEIPT'
         AND m.source_document_id = $2`,
      [companyId, goodsReceiptId],
    );
    const postedMap = new Map<string, number>();
    for (const row of movementResult.rows) {
      postedMap.set(row.goods_receipt_item_id, Number(row.posted_qty));
    }

    const completedMap = await this._sumReturnedByGrItem(
      client,
      companyId,
      goodsReceiptId,
      ['COMPLETED'],
    );
    // Exclude THIS return from the submitted reservation so it does not count
    // against itself when validating its own lines.
    const submittedMap = await this._sumReturnedByGrItem(
      client,
      companyId,
      goodsReceiptId,
      ['SUBMITTED'],
      returnId,
    );

    const returnableMap = new Map<string, number>();
    for (const [grItemId, posted] of postedMap) {
      returnableMap.set(
        grItemId,
        deriveReturnableQuantity({
          postedAcceptedQuantity: posted,
          completedReturnQuantity: completedMap.get(grItemId) ?? 0,
          submittedReturnQuantity: submittedMap.get(grItemId) ?? 0,
        }),
      );
    }
    return returnableMap;
  }

  async submit(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM purchase_returns
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PURCHASE_RETURN.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      const from = header.status as PurchaseReturnStatus;
      if (!canTransition(from, 'SUBMITTED')) {
        throw new InvariantError('PURCHASE_RETURN.INVALID_STATUS_TRANSITION');
      }

      // Reserve: validate each line's returnQuantity against the authoritative
      // returnable (posted − completed − submitted, excluding this return).
      const items = await this._loadItems(client, id);
      const returnableMap = await this._deriveReturnableForReturn(
        client,
        companyId,
        header.goods_receipt_id,
        id,
      );
      for (const item of items) {
        const returnable = returnableMap.get(item.goods_receipt_item_id) ?? 0;
        if (Number(item.return_quantity) > returnable) {
          throw new InvariantError('PURCHASE_RETURN.RETURN_QTY_EXCEEDS_RETURNABLE');
        }
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE purchase_returns
         SET status = 'SUBMITTED', submitted_by = $1, submitted_at = NOW(),
             updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, id, companyId],
      );

      await this._insertLog(client, id, from, 'SUBMITTED', userId, note);

      const finalItems = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toPurchaseReturn(updated.rows[0], finalItems, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM purchase_returns
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PURCHASE_RETURN.NOT_FOUND');
      }
      const from = headerResult.rows[0].status as PurchaseReturnStatus;
      if (!canTransition(from, 'CANCELLED')) {
        throw new InvariantError('PURCHASE_RETURN.INVALID_STATUS_TRANSITION');
      }

      // Mirror the GR convention (Opsi A): CANCELLED stays visible; it does not
      // set deleted_at. Flipping away from SUBMITTED releases the reservation
      // (the submitted-reservation sum no longer counts this return).
      const updated = await client.query<HeaderRow>(
        `UPDATE purchase_returns
         SET status = 'CANCELLED', cancelled_by = $1, cancelled_at = NOW(),
             updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, id, companyId],
      );

      await this._insertLog(client, id, from, 'CANCELLED', userId, note);

      const items = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toPurchaseReturn(updated.rows[0], items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async complete(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // 1. Lock the return header (company-scoped, not soft-deleted).
      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM purchase_returns
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PURCHASE_RETURN.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      const from = header.status as PurchaseReturnStatus;

      // 2. Idempotency: an already-COMPLETED return (reversal already posted) is
      // returned unchanged — a repeat complete is a no-op success, protecting
      // against double-posting the RETURN reversal (the DB source-key unique
      // index is the final guard).
      if (from === 'COMPLETED') {
        const items = await this._loadItems(client, id);
        const logs = await this._loadLogs(client, id);
        await client.query('COMMIT');
        return this._toPurchaseReturn(header, items, logs);
      }
      if (!canTransition(from, 'COMPLETED')) {
        throw new InvariantError('PURCHASE_RETURN.INVALID_STATUS_TRANSITION');
      }

      // 3. Post the RETURN reversal per item (outbound). Reload the source batch
      // FOR UPDATE, derive before/after. Goods already left stock, so a return
      // cannot exceed what is physically there: reject INSUFFICIENT_STOCK
      // (approved by user). Decrement qty_available (CONSUMED when 0) and append
      // a RETURN movement with the deterministic source key.
      const items = await this._loadItems(client, id);
      for (const item of items) {
        const qty = Number(item.return_quantity);

        const batchResult = await client.query<{ qty_available: string }>(
          `SELECT qty_available FROM inventory_batches
           WHERE id = $1 AND company_id = $2 FOR UPDATE`,
          [item.source_batch_id, companyId],
        );
        if (!batchResult.rowCount) {
          throw new NotFoundError('INVENTORY_BATCH.NOT_FOUND');
        }
        const beforeQty = Number(batchResult.rows[0].qty_available);
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
              source_document_type, source_document_id, source_document_item_id,
              source_document_allocation_id, user_id)
           VALUES ($1,$2,$3,$4,'RETURN',$5,$6,$7,'PURCHASE_RETURN',$8,$9,$10,$11)`,
          [
            companyId,
            header.outlet_id,
            item.source_batch_id,
            item.product_id,
            qty,
            beforeQty,
            afterQty,
            id,
            item.id,
            // allocation = source batch → unique key per (return, return item, batch)
            item.source_batch_id,
            userId,
          ],
        );
      }

      // 4. Flip to COMPLETED + completed audit + log the transition.
      const updated = await client.query<HeaderRow>(
        `UPDATE purchase_returns
         SET status = 'COMPLETED', completed_by = $1, completed_at = NOW(),
             updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, id, companyId],
      );

      await this._insertLog(client, id, from, 'COMPLETED', userId, note);

      const finalItems = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toPurchaseReturn(updated.rows[0], finalItems, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw translateDuplicateSourceKey(err);
    } finally {
      client.release();
    }
  }

  async ensureExists(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT 1 FROM purchase_returns
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('PURCHASE_RETURN.NOT_FOUND');
    }
  }

  async addComment(
    purchaseReturnId: string,
    companyId: string,
    authorId: string | null,
    data: NewPurchaseReturnCommentData,
  ): Promise<PurchaseReturnComment> {
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO purchase_return_comments
         (purchase_return_id, company_id, author_id, category, body)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [purchaseReturnId, companyId, authorId, data.category, data.body],
    );
    const result = await this.pool.query<CommentRow>(
      `${COMMENT_SELECT} WHERE c.id = $1`,
      [inserted.rows[0].id],
    );
    return this._toComment(result.rows[0]);
  }

  async listComments(
    purchaseReturnId: string,
    companyId: string,
  ): Promise<PurchaseReturnComment[]> {
    const result = await this.pool.query<CommentRow>(
      `${COMMENT_SELECT}
       WHERE c.purchase_return_id = $1 AND c.company_id = $2
       ORDER BY c.created_at ASC, c.id ASC`,
      [purchaseReturnId, companyId],
    );
    return result.rows.map((row) => this._toComment(row));
  }

  async addAttachment(
    purchaseReturnId: string,
    companyId: string,
    uploadedBy: string | null,
    data: NewPurchaseReturnAttachmentData,
  ): Promise<PurchaseReturnAttachment> {
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO purchase_return_attachments
         (purchase_return_id, company_id, original_name, stored_path, mime_type, size_bytes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        purchaseReturnId,
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
    purchaseReturnId: string,
    companyId: string,
  ): Promise<PurchaseReturnAttachment[]> {
    const result = await this.pool.query<AttachmentRow>(
      `${ATTACHMENT_SELECT}
       WHERE a.purchase_return_id = $1 AND a.company_id = $2
       ORDER BY a.created_at ASC, a.id ASC`,
      [purchaseReturnId, companyId],
    );
    return result.rows.map((row) => this._stripPath(this._toAttachment(row)));
  }

  async getAttachmentById(
    purchaseReturnId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseReturnAttachmentWithPath> {
    const result = await this.pool.query<AttachmentRow>(
      `${ATTACHMENT_SELECT}
       WHERE a.id = $1 AND a.purchase_return_id = $2 AND a.company_id = $3`,
      [attachmentId, purchaseReturnId, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('PURCHASE_RETURN_ATTACHMENT.NOT_FOUND');
    }
    return this._toAttachment(result.rows[0]);
  }

  async deleteAttachment(
    purchaseReturnId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseReturnAttachmentWithPath> {
    const result = await this.pool.query<AttachmentRow>(
      `DELETE FROM purchase_return_attachments a
       WHERE a.id = $1 AND a.purchase_return_id = $2 AND a.company_id = $3
       RETURNING a.id, a.original_name, a.stored_path, a.mime_type,
         a.size_bytes, a.uploaded_by, NULL AS uploaded_by_name, a.created_at`,
      [attachmentId, purchaseReturnId, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('PURCHASE_RETURN_ATTACHMENT.NOT_FOUND');
    }
    return this._toAttachment(result.rows[0]);
  }

  /** Map a unique-violation on return_number to a friendly conflict. */
  private _translateConflict(err: unknown): unknown {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505' &&
      'constraint' in err &&
      String((err as { constraint: string }).constraint).includes('purchase_returns_number')
    ) {
      return new InvariantError('PURCHASE_RETURN.NUMBER_CONFLICT');
    }
    return err;
  }
}
