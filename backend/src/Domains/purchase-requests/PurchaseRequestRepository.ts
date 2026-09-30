import { PurchaseRequest } from './entities/PurchaseRequest';
import { CreatePurchaseRequestItemInput } from './entities/CreatePurchaseRequest';
import { PurchaseRequestComment } from './entities/PurchaseRequestComment';
import {
  PurchaseRequestAttachment,
  PurchaseRequestAttachmentWithPath,
} from './entities/PurchaseRequestAttachment';
import { PurchaseRequestCommentCategory } from './purchaseRequestCommentCategory';

export interface NewPurchaseRequestCommentData {
  category: PurchaseRequestCommentCategory;
  body: string;
}

export interface NewPurchaseRequestAttachmentData {
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface NewPurchaseRequestData {
  destinationOutletId: string;
  expectedDate: string;
  notes: string | null;
  items: CreatePurchaseRequestItemInput[];
  totalEstimatedAmount: number;
}

export interface PurchaseRequestListFilter {
  limit: number;
  offset: number;
  status?: string;
  destinationOutletId?: string;
  search?: string;
}

export interface PurchaseRequestListResult {
  rows: PurchaseRequest[];
  total: number;
}

/**
 * Abstract repository — Purchase Request domain. Company-scoped.
 *
 * Every status-changing method appends a purchase_request_status_logs row in
 * the same transaction as the header update, so the approval timeline can
 * never drift from the document state. Numbering is generated race-safely
 * inside createDraft (PR-{outletCode}-YYYY-NNNNNN, per company, per year).
 */
export abstract class PurchaseRequestRepository {
  /** Create a DRAFT PR + items, generate pr_number, log (null -> DRAFT). */
  abstract createDraft(
    companyId: string,
    userId: string | null,
    data: NewPurchaseRequestData,
  ): Promise<PurchaseRequest>;

  /**
   * Replace an editable PR (DRAFT or REJECTED) header + items. If the PR was
   * REJECTED, updating resets it to DRAFT and logs REJECTED -> DRAFT.
   * Throws when the PR is not in an editable status.
   */
  abstract updateDraft(
    id: string,
    companyId: string,
    userId: string | null,
    data: NewPurchaseRequestData,
  ): Promise<PurchaseRequest>;

  abstract getById(id: string, companyId: string): Promise<PurchaseRequest>;

  abstract list(
    companyId: string,
    filter: PurchaseRequestListFilter,
  ): Promise<PurchaseRequestListResult>;

  /** DRAFT -> SUBMITTED. */
  abstract submit(id: string, companyId: string, userId: string | null): Promise<PurchaseRequest>;

  /** SUBMITTED -> APPROVED (records approved_by/approved_at). */
  abstract approve(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest>;

  /** SUBMITTED -> REJECTED (note recommended). */
  abstract reject(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest>;

  /** DRAFT|REJECTED -> CANCELLED (soft-delete + terminal status). */
  abstract cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest>;

  /**
   * Verify the PR exists in the company (throws PURCHASE_REQUEST.NOT_FOUND
   * otherwise). Used by the comment use cases to enforce tenant scope before
   * touching the thread.
   */
  abstract ensureExists(id: string, companyId: string): Promise<void>;

  /**
   * Append a comment to the PR thread and return it with the resolved author
   * name (JOIN to users).
   */
  abstract addComment(
    purchaseRequestId: string,
    companyId: string,
    authorId: string | null,
    data: NewPurchaseRequestCommentData,
  ): Promise<PurchaseRequestComment>;

  /** List the PR thread chronologically (each item carries authorName). */
  abstract listComments(
    purchaseRequestId: string,
    companyId: string,
  ): Promise<PurchaseRequestComment[]>;

  /**
   * Persist an attachment metadata row (the physical file is written by the
   * use case before this call) and return the stored metadata with the
   * uploader name resolved (JOIN to users).
   */
  abstract addAttachment(
    purchaseRequestId: string,
    companyId: string,
    uploadedBy: string | null,
    data: NewPurchaseRequestAttachmentData,
  ): Promise<PurchaseRequestAttachment>;

  /** List a PR's attachments chronologically (each carries uploadedByName). */
  abstract listAttachments(
    purchaseRequestId: string,
    companyId: string,
  ): Promise<PurchaseRequestAttachment[]>;

  /**
   * Fetch a single attachment (including the internal storedPath) scoped to
   * both the PR and the company. Throws PURCHASE_REQUEST_ATTACHMENT.NOT_FOUND
   * when the attachment does not belong to that PR/company (IDOR guard).
   */
  abstract getAttachmentById(
    purchaseRequestId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseRequestAttachmentWithPath>;

  /**
   * Delete an attachment row scoped to the PR and company, returning the
   * deleted metadata (including storedPath) so the use case can remove the
   * physical file. Throws PURCHASE_REQUEST_ATTACHMENT.NOT_FOUND when missing.
   */
  abstract deleteAttachment(
    purchaseRequestId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseRequestAttachmentWithPath>;
}
