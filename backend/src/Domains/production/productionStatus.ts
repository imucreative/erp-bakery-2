/**
 * Production Order lifecycle (production-domain §5):
 *   SCHEDULED -> IN_PROGRESS -> YIELD_COMPLETED -> QA_PASSED|QA_FAILED -> COMPLETED
 *   SCHEDULED -> CANCELLED (abandon before work starts)
 *
 * Stock is mutated ONLY on the transition into COMPLETED (backflushing,
 * production-domain rule #2):
 *   - from QA_PASSED: consume ingredients via FEFO (PRODUCTION_CONSUME) and
 *     create the finished-goods batch (PRODUCTION_RESULT).
 *   - from QA_FAILED: consume ingredients but scrap the output (no finished
 *     batch); the produced quantity is recorded as waste.
 *
 * Forbidden: YIELD_COMPLETED -> COMPLETED directly (must pass through QA).
 */
export const PRODUCTION_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'YIELD_COMPLETED',
  'QA_PASSED',
  'QA_FAILED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export function isProductionStatus(value: unknown): value is ProductionStatus {
  return typeof value === 'string' && (PRODUCTION_STATUSES as readonly string[]).includes(value);
}

const ALLOWED_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['YIELD_COMPLETED'],
  YIELD_COMPLETED: ['QA_PASSED', 'QA_FAILED'],
  QA_PASSED: ['COMPLETED'],
  QA_FAILED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: ProductionStatus, to: ProductionStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Terminal states — no further transitions allowed. */
export function isTerminalStatus(status: ProductionStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED';
}
