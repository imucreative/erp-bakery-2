import { PurchaseReturn } from './entities/PurchaseReturn';
import { PurchaseReturnReason } from './returnReason';
import { PurchaseReturnComment } from './entities/PurchaseReturnComment';
import {
  PurchaseReturnAttachment,
  PurchaseReturnAttachmentWithPath,
} from './entities/PurchaseReturnAttachment';
import { PurchaseReturnCommentCategory } from './purchaseReturnCommentCategory';

export interface NewPurchaseReturnCommentData {
  category: PurchaseReturnCommentCategory;
  body: string;
}

export interface NewPurchaseReturnAttachmentData {
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * One fully resolved Purchase Return line passed from the use case to the
 * repository. Every snapshot (posted accepted qty, previously returned qty,
 * product/uom/batch, source movement + batch references) is resolved server-side
 * from the source GR item's posted PURCHASE movement — never trusted from input
 * (doc 26 §6 #15/#16).
 */
export interface NewPurchaseReturnItemData {
  goodsReceiptItemId: string;
  sourceBatchId: string;
  sourceMovementId: string;
  productId: string;
  productSku: string;
  productName: string;
  uomId: string;
  uomCode: string;
  uomName: string;
  batchNumber: string | null;
  lotNumber: string | null;
  expiredDate: string | null;
  postedAcceptedQuantity: number;
  previouslyReturnedQuantity: number;
  returnQuantity: number;
  reason: PurchaseReturnReason;
  reasonDescription: string | null;
}

/**
 * Fully resolved Purchase Return header data. supplier/outlet snapshots and the
 * purchaseOrderId are inherited from the source GR by the use case; the
 * repository only persists them.
 */
export interface NewPurchaseReturnData {
  goodsReceiptId: string;
  purchaseOrderId: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  outletId: string;
  outletCode: string;
  outletName: string;
  returnDate: string;
  notes: string | null;
  items: NewPurchaseReturnItemData[];
}

export interface PurchaseReturnListFilter {
  limit: number;
  offset: number;
  status?: string;
  goodsReceiptId?: string;
  supplierId?: string;
  outletId?: string;
  search?: string;
}

export interface PurchaseReturnListResult {
  rows: PurchaseReturn[];
  total: number;
}

/**
 * One returnable line for a source Goods Receipt (doc 26 §6 #14–#16/#18),
 * derived from the GR's posted accepted PURCHASE movements. `returnableQuantity`
 * is the authoritative derivation:
 *   postedAcceptedQuantity − completedReturnQuantity − submittedReturnQuantity.
 * It carries the source movement + batch references and the product/uom/batch
 * snapshots the create payload needs. Lines with returnableQuantity 0 may be
 * returned so the frontend can show fully-returned lines greyed out; the use
 * case rejects any attempt to return a 0-returnable line.
 */
export interface ReturnableLine {
  goodsReceiptItemId: string;
  sourceBatchId: string;
  sourceMovementId: string;
  productId: string;
  productSku: string;
  productName: string;
  uomId: string;
  uomCode: string;
  uomName: string;
  batchNumber: string | null;
  lotNumber: string | null;
  expiredDate: Date | null;
  postedAcceptedQuantity: number;
  completedReturnQuantity: number;
  submittedReturnQuantity: number;
  returnableQuantity: number;
}

/**
 * Abstract repository — Purchase Return domain. Company-scoped.
 *
 * Every status-changing method appends a purchase_return_status_logs row in the
 * same transaction as the header update so the timeline never drifts.
 * Numbering (RTN-YYYY-NNNNNN, per company, per year) is generated race-safely
 * inside createDraft.
 *
 * Reservation + reversal semantics (doc 26 §6 #18/#19): submit reserves the
 * returnable qty (status flip + validation only — no stock movement); cancel
 * releases it; complete posts the RETURN inventory reversal atomically.
 */
export abstract class PurchaseReturnRepository {
  /** Create a DRAFT return + items, generate return_number, log (null -> DRAFT). */
  abstract createDraft(
    companyId: string,
    userId: string | null,
    data: NewPurchaseReturnData,
  ): Promise<PurchaseReturn>;

  /**
   * Replace an editable (DRAFT) return header + items. Throws when the return is
   * not in an editable status.
   */
  abstract updateDraft(
    id: string,
    companyId: string,
    userId: string | null,
    data: NewPurchaseReturnData,
  ): Promise<PurchaseReturn>;

  abstract getById(id: string, companyId: string): Promise<PurchaseReturn>;

  abstract list(
    companyId: string,
    filter: PurchaseReturnListFilter,
  ): Promise<PurchaseReturnListResult>;

  /**
   * Compute the returnable lines for a source Goods Receipt (company-scoped).
   * The GR must exist, belong to the company and be COMPLETED (otherwise its
   * accepted quantities were never posted). For each posted accepted PURCHASE
   * movement of the GR, returns postedAcceptedQuantity, the already-returned
   * (COMPLETED) quantity, the reserved (SUBMITTED) quantity, and the derived
   * returnableQuantity, plus the product/uom/batch snapshots and the source
   * movement/batch references needed to raise a return (doc 26 §6 #14–#16).
   */
  abstract getReturnable(
    goodsReceiptId: string,
    companyId: string,
  ): Promise<ReturnableLine[]>;

  /**
   * DRAFT -> SUBMITTED. Reserves the returnable quantity (doc 26 §6 #18): the
   * repository re-derives returnable authoritatively (excluding this return) and
   * rejects when any line's returnQuantity exceeds it
   * (PURCHASE_RETURN.RETURN_QTY_EXCEEDS_RETURNABLE). No stock moves on submit.
   */
  abstract submit(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn>;

  /**
   * SUBMITTED -> COMPLETED. Posts the RETURN inventory reversal ATOMICALLY in a
   * single concurrency-safe (SERIALIZABLE) transaction (doc 26 §6 #19,
   * doc 35 §8). Within that one transaction:
   *   1. lock the return header FOR UPDATE; validate the status transition;
   *   2. idempotency — an already-COMPLETED return returns unchanged ONLY when
   *      its deterministic RETURN reversal movements already exist;
   *   3. for every item: reload the source InventoryBatch FOR UPDATE, derive
   *      before/after; if the batch balance < returnQuantity reject with
   *      INVENTORY.INSUFFICIENT_STOCK (goods already left — approved by user);
   *   4. append a RETURN (outbound) inventory_movements row with the
   *      deterministic source key (PURCHASE_RETURN / returnId / returnItemId /
   *      sourceBatchId) and decrement qty_available (CONSUMED when 0);
   *   5. flip status to COMPLETED, set completed_* audit, append the status log.
   * A duplicate source key (23505) is translated to
   * INVENTORY.DUPLICATE_MOVEMENT_SOURCE so a re-complete never double-posts.
   */
  abstract complete(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn>;

  /**
   * DRAFT|SUBMITTED -> CANCELLED (terminal). Releases the SUBMITTED reservation
   * (the status change alone removes this return from the submitted-reservation
   * sum). Mirrors the GR convention (Opsi A): CANCELLED stays visible and does
   * NOT set deleted_at.
   */
  abstract cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn>;

  /**
   * Verify the return exists in the company (throws PURCHASE_RETURN.NOT_FOUND
   * otherwise). Used by the comment/attachment use cases to enforce tenant
   * scope before touching the thread/attachments.
   */
  abstract ensureExists(id: string, companyId: string): Promise<void>;

  /**
   * Append a comment to the return thread and return it with the resolved
   * author name (JOIN to users).
   */
  abstract addComment(
    purchaseReturnId: string,
    companyId: string,
    authorId: string | null,
    data: NewPurchaseReturnCommentData,
  ): Promise<PurchaseReturnComment>;

  /** List the return thread chronologically (each item carries authorName). */
  abstract listComments(
    purchaseReturnId: string,
    companyId: string,
  ): Promise<PurchaseReturnComment[]>;

  /**
   * Persist an attachment metadata row (the physical file is written by the
   * use case before this call) and return the stored metadata with the
   * uploader name resolved (JOIN to users).
   */
  abstract addAttachment(
    purchaseReturnId: string,
    companyId: string,
    uploadedBy: string | null,
    data: NewPurchaseReturnAttachmentData,
  ): Promise<PurchaseReturnAttachment>;

  /** List a return's attachments chronologically (each carries uploadedByName). */
  abstract listAttachments(
    purchaseReturnId: string,
    companyId: string,
  ): Promise<PurchaseReturnAttachment[]>;

  /**
   * Fetch a single attachment (including the internal storedPath) scoped to
   * both the return and the company. Throws
   * PURCHASE_RETURN_ATTACHMENT.NOT_FOUND when the attachment does not belong to
   * that return/company (IDOR guard).
   */
  abstract getAttachmentById(
    purchaseReturnId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseReturnAttachmentWithPath>;

  /**
   * Delete an attachment row scoped to the return and company, returning the
   * deleted metadata (including storedPath) so the use case can remove the
   * physical file. Throws PURCHASE_RETURN_ATTACHMENT.NOT_FOUND when missing.
   */
  abstract deleteAttachment(
    purchaseReturnId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseReturnAttachmentWithPath>;
}
