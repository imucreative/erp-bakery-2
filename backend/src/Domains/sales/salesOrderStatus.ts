/**
 * SalesOrder lifecycle (POS / Sales — doc 51 §6.1, DRAFT skipped — OQ-1):
 *
 *   PENDING_PAYMENT -> PAID -> REFUNDED
 *   PENDING_PAYMENT -> CANCELLED
 *
 * Allowed:  PENDING_PAYMENT->PAID, PENDING_PAYMENT->CANCELLED, PAID->REFUNDED.
 * Forbidden: REFUNDED->*, CANCELLED->*, PAID->CANCELLED (use REFUNDED).
 *
 * NOTE: the PAID->REFUNDED transition is defined here now but only USED in
 * Fase 3 (refund / SALE_RETURN). Stock is only cut on PENDING_PAYMENT->PAID.
 */
export const SALES_ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'CANCELLED',
  'REFUNDED',
] as const;

export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export function isSalesOrderStatus(value: unknown): value is SalesOrderStatus {
  return (
    typeof value === 'string' && (SALES_ORDER_STATUSES as readonly string[]).includes(value)
  );
}

const ALLOWED_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: SalesOrderStatus, to: SalesOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
