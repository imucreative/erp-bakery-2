/**
 * Purchase Request lifecycle (purchase-request-blueprint doc 34 §4,
 * global-erp-standards doc 35 §1):
 *
 *   DRAFT     -> SUBMITTED | CANCELLED
 *   SUBMITTED -> APPROVED  | REJECTED
 *   REJECTED  -> DRAFT (resubmit/update) | CANCELLED
 *   APPROVED  -> (terminal)
 *   CANCELLED -> (terminal)
 *
 * This value object is the single source of truth for allowed transitions and
 * is intentionally generic so future procurement documents (PO/GR/Return) can
 * follow the same status-machine shape.
 */
export const PURCHASE_REQUEST_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export function isPurchaseRequestStatus(value: unknown): value is PurchaseRequestStatus {
  return (
    typeof value === 'string' &&
    (PURCHASE_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

const ALLOWED_TRANSITIONS: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  REJECTED: ['DRAFT', 'CANCELLED'],
  APPROVED: [],
  CANCELLED: [],
};

export function canTransition(
  from: PurchaseRequestStatus,
  to: PurchaseRequestStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses in which a PR may be edited (doc 43 §3). */
export function isEditableStatus(status: PurchaseRequestStatus): boolean {
  return status === 'DRAFT' || status === 'REJECTED';
}
