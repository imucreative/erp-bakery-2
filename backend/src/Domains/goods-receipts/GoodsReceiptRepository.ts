import { GoodsReceipt } from './entities/GoodsReceipt';
import { ResolvedGoodsReceiptItem } from './entities/CreateGoodsReceipt';
import { GoodsReceiptComment } from './entities/GoodsReceiptComment';
import {
  GoodsReceiptAttachment,
  GoodsReceiptAttachmentWithPath,
} from './entities/GoodsReceiptAttachment';
import { GoodsReceiptCommentCategory } from './goodsReceiptCommentCategory';

export interface NewGoodsReceiptCommentData {
  category: GoodsReceiptCommentCategory;
  body: string;
}

export interface NewGoodsReceiptAttachmentData {
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Fully resolved GR data passed from the use case to the repository. supplierId
 * and destinationOutletId are snapshots the use case inherited from the source
 * PO; ordered quantities on items are PO-line snapshots. The repository only
 * persists them.
 */
export interface NewGoodsReceiptData {
  purchaseOrderId: string;
  supplierId: string;
  destinationOutletId: string;
  receiveDate: string;
  items: ResolvedGoodsReceiptItem[];
  notes: string | null;
}

export interface GoodsReceiptListFilter {
  limit: number;
  offset: number;
  status?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  destinationOutletId?: string;
  search?: string;
}

export interface GoodsReceiptListResult {
  rows: GoodsReceipt[];
  total: number;
}

/**
 * Abstract repository — Goods Receipt domain. Company-scoped.
 *
 * Every status-changing method appends a goods_receipt_status_logs row in the
 * same transaction as the header update, so the approval timeline can never
 * drift from the document state. Numbering is generated race-safely inside
 * createDraft (GR-YYYY-NNNNNN, per company, per year — no outlet code).
 *
 * Stage 1 scope: createDraft, updateDraft, getById, list, cancel, plus the
 * cross-document consumption query used for outstanding. The complete action
 * (DRAFT -> COMPLETED with inventory posting) is intentionally NOT part of this
 * repository yet; it arrives in Stage 2.
 */
export abstract class GoodsReceiptRepository {
  /** Create a DRAFT GR + items, generate gr_number, log (null -> DRAFT). */
  abstract createDraft(
    companyId: string,
    userId: string | null,
    data: NewGoodsReceiptData,
  ): Promise<GoodsReceipt>;

  /**
   * Replace an editable (DRAFT) GR header + items. Throws when the GR is not in
   * an editable status.
   */
  abstract updateDraft(
    id: string,
    companyId: string,
    userId: string | null,
    data: NewGoodsReceiptData,
  ): Promise<GoodsReceipt>;

  abstract getById(id: string, companyId: string): Promise<GoodsReceipt>;

  abstract list(
    companyId: string,
    filter: GoodsReceiptListFilter,
  ): Promise<GoodsReceiptListResult>;

  /**
   * Sum the received quantity (accepted + rejected) per PO line consumed by
   * CONSUMING GRs of the given PO (status in DRAFT, COMPLETED), company-scoped.
   * CANCELLED GRs are excluded (their consumption returns to the PO). When
   * `excludeGoodsReceiptId` is provided (edit mode), that GR's own consumption
   * is left out so it is not double-counted against itself.
   *
   * Returns a Map keyed by purchase_order_items.id; PO lines with no consumption
   * are absent (the caller treats a missing key as 0).
   */
  abstract getConsumedQtyByPoItem(
    purchaseOrderId: string,
    companyId: string,
    excludeGoodsReceiptId?: string,
  ): Promise<Map<string, number>>;

  /**
   * DRAFT -> CANCELLED (terminal status). Opsi A (2026-10-02): cancelling no
   * longer soft-deletes the row — a CANCELLED GR stays visible in list views;
   * deleted_at is reserved for genuine hard-delete only.
   */
  abstract cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<GoodsReceipt>;

  /**
   * Complete a DRAFT GR (DRAFT -> COMPLETED) and post its ACCEPTED lines to
   * inventory ATOMICALLY in a single concurrency-safe (SERIALIZABLE) transaction
   * (Stage 2, Opsi A). Within that one transaction:
   *   1. lock the GR header FOR UPDATE;
   *   2. idempotency — if the GR is already COMPLETED (inventory_posted_at set),
   *      return it unchanged (idempotent success), mirroring the inventory
   *      complete pattern; a non-DRAFT, non-COMPLETED status is rejected;
   *   3. for every item with acceptedQuantity > 0: resolve-or-create the target
   *      InventoryBatch (batch-tracked lines carry batchNumber + expiry;
   *      non-batch lines — batchNumber null — use the '' sentinel + is_non_batch
   *      synthetic row + null expiry), lock it, add accepted qty, and append a
   *      PURCHASE inventory_movements row with the deterministic source key
   *      (GOODS_RECEIPT / grId / grItemId / resolved batchId);
   *   4. flip status to COMPLETED, set inventory_posted_at = NOW(), and append a
   *      DRAFT -> COMPLETED status log.
   * Rejected quantities are NOT posted (doc 26 §6.12, doc 27 §6 #4). The DB
   * source-key unique index blocks a double-post of the same GR line (rule #5).
   * If any posting step fails the whole transaction rolls back and the GR is NOT
   * marked COMPLETED. The ledger write path reuses the shared helpers so it is
   * identical to postMovements.
   */
  abstract complete(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<GoodsReceipt>;

  /**
   * Verify the GR exists in the company (throws GOODS_RECEIPT.NOT_FOUND
   * otherwise). Used by the comment use cases to enforce tenant scope before
   * touching the thread.
   */
  abstract ensureExists(id: string, companyId: string): Promise<void>;

  /**
   * Append a comment to the GR thread and return it with the resolved author
   * name (JOIN to users).
   */
  abstract addComment(
    goodsReceiptId: string,
    companyId: string,
    authorId: string | null,
    data: NewGoodsReceiptCommentData,
  ): Promise<GoodsReceiptComment>;

  /** List the GR thread chronologically (each item carries authorName). */
  abstract listComments(
    goodsReceiptId: string,
    companyId: string,
  ): Promise<GoodsReceiptComment[]>;

  /**
   * Persist an attachment metadata row (the physical file is written by the
   * use case before this call) and return the stored metadata with the
   * uploader name resolved (JOIN to users).
   */
  abstract addAttachment(
    goodsReceiptId: string,
    companyId: string,
    uploadedBy: string | null,
    data: NewGoodsReceiptAttachmentData,
  ): Promise<GoodsReceiptAttachment>;

  /** List a GR's attachments chronologically (each carries uploadedByName). */
  abstract listAttachments(
    goodsReceiptId: string,
    companyId: string,
  ): Promise<GoodsReceiptAttachment[]>;

  /**
   * Fetch a single attachment (including the internal storedPath) scoped to
   * both the GR and the company. Throws GOODS_RECEIPT_ATTACHMENT.NOT_FOUND
   * when the attachment does not belong to that GR/company (IDOR guard).
   */
  abstract getAttachmentById(
    goodsReceiptId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<GoodsReceiptAttachmentWithPath>;

  /**
   * Delete an attachment row scoped to the GR and company, returning the
   * deleted metadata (including storedPath) so the use case can remove the
   * physical file. Throws GOODS_RECEIPT_ATTACHMENT.NOT_FOUND when missing.
   */
  abstract deleteAttachment(
    goodsReceiptId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<GoodsReceiptAttachmentWithPath>;
}
