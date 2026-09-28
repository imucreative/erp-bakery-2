/**
 * Adjustment reason codes. Reason is mandatory for every adjustment line
 * (inventory-domain §7 validation rules).
 *
 * EXPIRED is only valid when the shared expiry classifier marks the batch
 * expired (rule #21) — enforced at completion time.
 */
export const ADJUSTMENT_REASONS = [
  'STOCK_COUNT',
  'DAMAGED',
  'EXPIRED',
  'LOST',
  'FOUND',
  'CORRECTION',
  'OTHER',
] as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

export function isAdjustmentReason(value: unknown): value is AdjustmentReason {
  return typeof value === 'string' && (ADJUSTMENT_REASONS as readonly string[]).includes(value);
}

export const ADJUSTMENT_DIRECTIONS = ['IN', 'OUT'] as const;
export type AdjustmentDirection = (typeof ADJUSTMENT_DIRECTIONS)[number];

export function isAdjustmentDirection(value: unknown): value is AdjustmentDirection {
  return value === 'IN' || value === 'OUT';
}
