/**
 * Goods Receipt lifecycle (procurement-domain doc 26 §5 subset,
 * global-erp-standards doc 35 §1):
 *
 *   DRAFT     -> COMPLETED | CANCELLED
 *   COMPLETED -> (terminal)
 *   CANCELLED -> (terminal)
 *
 * This value object is the single source of truth for allowed transitions.
 *
 * STAGE 1 note: only DRAFT -> CANCELLED is wired by the current use cases
 * (soft-delete). DRAFT -> COMPLETED is defined here now so Stage 2 (inventory
 * posting) can add the complete action without touching the status machine. A
 * COMPLETED GR can never be cancelled — corrections flow through Purchase
 * Return / Stock Adjustment later.
 */
export const GOODS_RECEIPT_STATUSES = ['DRAFT', 'COMPLETED', 'CANCELLED'] as const;

export type GoodsReceiptStatus = (typeof GOODS_RECEIPT_STATUSES)[number];

export function isGoodsReceiptStatus(value: unknown): value is GoodsReceiptStatus {
  return (
    typeof value === 'string' &&
    (GOODS_RECEIPT_STATUSES as readonly string[]).includes(value)
  );
}

const ALLOWED_TRANSITIONS: Record<GoodsReceiptStatus, GoodsReceiptStatus[]> = {
  DRAFT: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  from: GoodsReceiptStatus,
  to: GoodsReceiptStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses in which a GR may be edited (DRAFT only). */
export function isEditableStatus(status: GoodsReceiptStatus): boolean {
  return status === 'DRAFT';
}
