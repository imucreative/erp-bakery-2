/**
 * Production Order lifecycle (production-domain §5) — INSTANT-COMPLETE.
 *
 * Production is a single, atomic action: creating a production order IS the
 * production run. Ingredients are backflushed and finished goods are produced
 * in one transaction, and the order is persisted directly as COMPLETED. There
 * are no intermediate states (no SCHEDULED/IN_PROGRESS/QA) and no cancellation
 * (nothing partial is ever persisted — a create either fully succeeds and lands
 * on COMPLETED, or it fails and nothing is written).
 *
 * Stock is mutated as part of that same create transaction (backflushing,
 * production-domain rule #2):
 *   - consume ingredients via FEFO (PRODUCTION_CONSUME), and
 *   - when actualQty > 0, create the finished-goods batch (PRODUCTION_RESULT).
 */
export const PRODUCTION_STATUSES = ['COMPLETED'] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export function isProductionStatus(value: unknown): value is ProductionStatus {
  return typeof value === 'string' && (PRODUCTION_STATUSES as readonly string[]).includes(value);
}

/** Terminal states — no further transitions allowed. COMPLETED is terminal. */
export function isTerminalStatus(status: ProductionStatus): boolean {
  return status === 'COMPLETED';
}
