/**
 * Stock Adjustment lifecycle (inventory-domain rule #19):
 *   DRAFT -> SUBMITTED -> APPROVED -> COMPLETED
 *   DRAFT -> CANCELLED, SUBMITTED -> CANCELLED
 * APPROVED and COMPLETED are NOT cancellable. COMPLETED is terminal.
 */
export const ADJUSTMENT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number];

export function isAdjustmentStatus(value: unknown): value is AdjustmentStatus {
  return typeof value === 'string' && (ADJUSTMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Allowed transitions map. Key = current status, value = allowed next statuses.
 */
const ALLOWED_TRANSITIONS: Record<AdjustmentStatus, AdjustmentStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: AdjustmentStatus, to: AdjustmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
