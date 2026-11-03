import { toJakartaBusinessDate } from '../../Commons/helpers/businessDate';

/**
 * Inventory batch lifecycle status.
 *
 * - ACTIVE     : usable stock
 * - EXPIRED    : past expiry; visible but not consumable
 * - CONSUMED   : fully depleted (qty_available = 0)
 * - QUARANTINE : held, not available for allocation
 */
export const BATCH_STATUSES = ['ACTIVE', 'EXPIRED', 'CONSUMED', 'QUARANTINE'] as const;

export type BatchStatus = (typeof BATCH_STATUSES)[number];

export function isBatchStatus(value: unknown): value is BatchStatus {
  return typeof value === 'string' && (BATCH_STATUSES as readonly string[]).includes(value);
}

/**
 * MVP threshold for "expiring soon" classification (inventory-domain rule #14).
 * Future configurable-policy candidate.
 */
export const INVENTORY_EXPIRY_SOON_DAYS = 30;

/**
 * Expiry classification result for a batch relative to a business date.
 */
export type ExpiryState = 'EXPIRED' | 'EXPIRING_SOON' | 'OK' | 'NOT_APPLICABLE';

/**
 * Operational view shown to users: an ACTIVE batch past its expiry date reads
 * as EXPIRED. Held or depleted states are never rewritten by the calendar, and
 * the stored lifecycle status is left untouched.
 */
export function deriveOperationalStatus(
  status: BatchStatus,
  expiryState: ExpiryState,
): BatchStatus {
  return status === 'ACTIVE' && expiryState === 'EXPIRED' ? 'EXPIRED' : status;
}

/**
 * Classify a batch expiry against the business date (inventory-domain rule #14).
 * `expiredDate` is a calendar date anchored at UTC midnight; the business date
 * is compared on its WIB calendar day, so a batch stays valid through its
 * expiry day and turns EXPIRED only after it:
 * - expiredDate < businessDate            => EXPIRED
 * - expiredDate within N days (inclusive) => EXPIRING_SOON  (== businessDate counts here)
 * - otherwise                             => OK
 * Non-batch synthetic rows are NOT_APPLICABLE.
 */
export function classifyExpiry(
  expiredDate: Date | null,
  businessDate: Date,
  isNonBatch = false,
  soonDays: number = INVENTORY_EXPIRY_SOON_DAYS,
): ExpiryState {
  if (isNonBatch || !expiredDate) return 'NOT_APPLICABLE';

  // Normalise to date-only (strip time) for stable day comparisons
  const exp = Date.UTC(
    expiredDate.getUTCFullYear(),
    expiredDate.getUTCMonth(),
    expiredDate.getUTCDate(),
  );
  const today = Date.parse(`${toJakartaBusinessDate(businessDate)}T00:00:00Z`);

  if (exp < today) return 'EXPIRED';

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.round((exp - today) / msPerDay);
  if (daysUntil <= soonDays) return 'EXPIRING_SOON';

  return 'OK';
}
