/**
 * Purchase Order lifecycle (procurement-domain doc 26 §5,
 * global-erp-standards doc 35 §1):
 *
 *   DRAFT     -> SUBMITTED | CANCELLED
 *   SUBMITTED -> APPROVED  | REJECTED
 *   REJECTED  -> DRAFT (resubmit/update) | CANCELLED
 *   APPROVED  -> CANCELLED (owner voids the order)
 *   CANCELLED -> (terminal)
 *
 * This value object is the single source of truth for allowed transitions.
 * Note it differs from the Purchase Request machine in one place: PO allows
 * APPROVED -> CANCELLED (doc 26 §5), whereas an approved PR is terminal.
 */
export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export function isPurchaseOrderStatus(value: unknown): value is PurchaseOrderStatus {
  return (
    typeof value === 'string' &&
    (PURCHASE_ORDER_STATUSES as readonly string[]).includes(value)
  );
}

const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  REJECTED: ['DRAFT', 'CANCELLED'],
  APPROVED: ['CANCELLED'],
  CANCELLED: [],
};

export function canTransition(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses in which a PO may be edited (doc 26 §6 — editable while not locked). */
export function isEditableStatus(status: PurchaseOrderStatus): boolean {
  return status === 'DRAFT' || status === 'REJECTED';
}
