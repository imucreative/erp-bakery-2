/**
 * Purchase Return reason — controlled values (procurement-domain doc 26 §6 #17).
 *
 * When reason = OTHER, a free-text reasonDescription is MANDATORY (enforced in
 * the DTO + CreatePurchaseReturn domain validation). For every other reason the
 * description is optional.
 */
export const PURCHASE_RETURN_REASONS = [
  'DAMAGED',
  'WRONG_ITEM',
  'QUALITY_ISSUE',
  'EXPIRED',
  'OVER_DELIVERY',
  'OTHER',
] as const;

export type PurchaseReturnReason = (typeof PURCHASE_RETURN_REASONS)[number];

export function isPurchaseReturnReason(value: unknown): value is PurchaseReturnReason {
  return (
    typeof value === 'string' &&
    (PURCHASE_RETURN_REASONS as readonly string[]).includes(value)
  );
}

/** reasonDescription is required only when the reason is OTHER (doc 26 §6 #17). */
export function requiresDescription(reason: PurchaseReturnReason): boolean {
  return reason === 'OTHER';
}
