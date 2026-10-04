/**
 * Payment methods accepted at POS (doc 51 §4.6).
 *
 * Only CASH feeds shift expected_cash reconciliation (OQ-8, §4.2); the other
 * methods are recorded for reporting but never affect the physical drawer.
 */
export const PAYMENT_METHODS = ['CASH', 'CARD', 'QRIS', 'BANK_TRANSFER'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);
}
