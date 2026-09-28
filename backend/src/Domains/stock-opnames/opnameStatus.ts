/**
 * Stock Opname lifecycle (inventory-domain rule #23):
 *   DRAFT -> COUNTING -> SUBMITTED -> APPROVED -> COMPLETED
 *   DRAFT/COUNTING/SUBMITTED -> CANCELLED
 * APPROVED and COMPLETED are not cancellable via normal workflow.
 *
 * Outlet stock is hard-locked while COUNTING, SUBMITTED, or APPROVED (rule #24);
 * the lock is released only by COMPLETED or CANCELLED.
 */
export const OPNAME_STATUSES = [
  'DRAFT',
  'COUNTING',
  'SUBMITTED',
  'APPROVED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OpnameStatus = (typeof OPNAME_STATUSES)[number];

export function isOpnameStatus(value: unknown): value is OpnameStatus {
  return typeof value === 'string' && (OPNAME_STATUSES as readonly string[]).includes(value);
}

/** Statuses during which outlet stock mutation is locked (rule #24). */
export const OPNAME_LOCKING_STATUSES: readonly OpnameStatus[] = [
  'COUNTING',
  'SUBMITTED',
  'APPROVED',
];

const ALLOWED_TRANSITIONS: Record<OpnameStatus, OpnameStatus[]> = {
  DRAFT: ['COUNTING', 'CANCELLED'],
  COUNTING: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: OpnameStatus, to: OpnameStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
