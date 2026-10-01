import { PurchaseOrder } from './entities/PurchaseOrder';
import { CreatePurchaseOrderItemInput } from './entities/CreatePurchaseOrder';
import { PurchaseOrderComment } from './entities/PurchaseOrderComment';
import {
  PurchaseOrderAttachment,
  PurchaseOrderAttachmentWithPath,
} from './entities/PurchaseOrderAttachment';
import { PurchaseOrderCommentCategory } from './purchaseOrderCommentCategory';

export interface NewPurchaseOrderCommentData {
  category: PurchaseOrderCommentCategory;
  body: string;
}

export interface NewPurchaseOrderAttachmentData {
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Fully resolved PO data passed from the service/use-case layer to the
 * repository. All money fields and the payment-term snapshot are computed by
 * the use case (anti-tamper); the repository only persists them.
 */
export interface NewPurchaseOrderData {
  purchaseRequestId: string;
  supplierId: string;
  destinationOutletId: string;
  orderDate: string;
  paymentTermId: string | null;
  paymentTermCode: string | null;
  paymentTermName: string | null;
  paymentTermDueDays: number | null;
  estimatedPaymentDueDate: string | null;
  items: CreatePurchaseOrderItemInput[];
  totalAmount: number;
  taxTotal: number;
  grandTotal: number;
  notes: string | null;
}

export interface PurchaseOrderListFilter {
  limit: number;
  offset: number;
  status?: string;
  supplierId?: string;
  destinationOutletId?: string;
  purchaseRequestId?: string;
  search?: string;
}

export interface PurchaseOrderListResult {
  rows: PurchaseOrder[];
  total: number;
}

/**
 * Abstract repository — Purchase Order domain. Company-scoped.
 *
 * Every status-changing method appends a purchase_order_status_logs row in the
 * same transaction as the header update, so the approval timeline can never
 * drift from the document state. Numbering is generated race-safely inside
 * createDraft (PO-{outletCode}-YYYY-NNNNNN, per company, per year).
 *
 * The destination outlet code (for numbering) is derived from the source PR's
 * destination outlet by the use case and passed via NewPurchaseOrderData.
 */
export abstract class PurchaseOrderRepository {
  /** Create a DRAFT PO + items, generate po_number, log (null -> DRAFT). */
  abstract createDraft(
    companyId: string,
    userId: string | null,
    data: NewPurchaseOrderData,
  ): Promise<PurchaseOrder>;

  /**
   * Replace an editable PO (DRAFT or REJECTED) header + items. If the PO was
   * REJECTED, updating resets it to DRAFT and logs REJECTED -> DRAFT.
   * Throws when the PO is not in an editable status.
   */
  abstract updateDraft(
    id: string,
    companyId: string,
    userId: string | null,
    data: NewPurchaseOrderData,
  ): Promise<PurchaseOrder>;

  abstract getById(id: string, companyId: string): Promise<PurchaseOrder>;

  abstract list(
    companyId: string,
    filter: PurchaseOrderListFilter,
  ): Promise<PurchaseOrderListResult>;

  /** DRAFT -> SUBMITTED. */
  abstract submit(id: string, companyId: string, userId: string | null): Promise<PurchaseOrder>;

  /** SUBMITTED -> APPROVED (records approved_by/approved_at). */
  abstract approve(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder>;

  /** SUBMITTED -> REJECTED (note required by the use case). */
  abstract reject(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder>;

  /** DRAFT|REJECTED|APPROVED -> CANCELLED (soft-delete + terminal status). */
  abstract cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder>;

  /**
   * Verify the PO exists in the company (throws PURCHASE_ORDER.NOT_FOUND
   * otherwise). Used by the comment use cases to enforce tenant scope before
   * touching the thread.
   */
  abstract ensureExists(id: string, companyId: string): Promise<void>;

  /**
   * Append a comment to the PO thread and return it with the resolved author
   * name (JOIN to users).
   */
  abstract addComment(
    purchaseOrderId: string,
    companyId: string,
    authorId: string | null,
    data: NewPurchaseOrderCommentData,
  ): Promise<PurchaseOrderComment>;

  /** List the PO thread chronologically (each item carries authorName). */
  abstract listComments(
    purchaseOrderId: string,
    companyId: string,
  ): Promise<PurchaseOrderComment[]>;

  /**
   * Persist an attachment metadata row (the physical file is written by the
   * use case before this call) and return the stored metadata with the
   * uploader name resolved (JOIN to users).
   */
  abstract addAttachment(
    purchaseOrderId: string,
    companyId: string,
    uploadedBy: string | null,
    data: NewPurchaseOrderAttachmentData,
  ): Promise<PurchaseOrderAttachment>;

  /** List a PO's attachments chronologically (each carries uploadedByName). */
  abstract listAttachments(
    purchaseOrderId: string,
    companyId: string,
  ): Promise<PurchaseOrderAttachment[]>;

  /**
   * Fetch a single attachment (including the internal storedPath) scoped to
   * both the PO and the company. Throws PURCHASE_ORDER_ATTACHMENT.NOT_FOUND
   * when the attachment does not belong to that PO/company (IDOR guard).
   */
  abstract getAttachmentById(
    purchaseOrderId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseOrderAttachmentWithPath>;

  /**
   * Delete an attachment row scoped to the PO and company, returning the
   * deleted metadata (including storedPath) so the use case can remove the
   * physical file. Throws PURCHASE_ORDER_ATTACHMENT.NOT_FOUND when missing.
   */
  abstract deleteAttachment(
    purchaseOrderId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseOrderAttachmentWithPath>;
}
