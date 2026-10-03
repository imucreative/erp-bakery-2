/**
 * Purchase Return lifecycle (procurement-domain doc 26 §6 #18,
 * global-erp-standards doc 35 §1). Approved by user — NO APPROVED step:
 *
 *   DRAFT     -> SUBMITTED | CANCELLED
 *   SUBMITTED -> COMPLETED | CANCELLED
 *   COMPLETED -> (terminal)
 *   CANCELLED -> (terminal)
 *
 * This value object is the single source of truth for allowed transitions.
 *
 * Reservation semantics attached to the lifecycle (doc 26 §6 #18): DRAFT does
 * NOT reserve returnable stock; SUBMITTED reserves it; CANCELLED releases it;
 * COMPLETED consumes it (posts the RETURN inventory reversal). COMPLETED and
 * CANCELLED are terminal.
 */
export const PURCHASE_RETURN_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type PurchaseReturnStatus = (typeof PURCHASE_RETURN_STATUSES)[number];

export function isPurchaseReturnStatus(value: unknown): value is PurchaseReturnStatus {
  return (
    typeof value === 'string' &&
    (PURCHASE_RETURN_STATUSES as readonly string[]).includes(value)
  );
}

const ALLOWED_TRANSITIONS: Record<PurchaseReturnStatus, PurchaseReturnStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  from: PurchaseReturnStatus,
  to: PurchaseReturnStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses in which a Purchase Return may be edited (DRAFT only). */
export function isEditableStatus(status: PurchaseReturnStatus): boolean {
  return status === 'DRAFT';
}
