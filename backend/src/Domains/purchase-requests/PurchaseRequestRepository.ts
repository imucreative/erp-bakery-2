import { PurchaseRequest } from './entities/PurchaseRequest';
import { CreatePurchaseRequestItemInput } from './entities/CreatePurchaseRequest';

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
}
