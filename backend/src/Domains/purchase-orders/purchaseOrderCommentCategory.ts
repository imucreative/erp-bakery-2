/**
 * Purchase Order comment categories (global-erp-standards doc 35 §6).
 *
 *   APPROVAL  - written by supervisors during Approve/Reject actions.
 *   INTERNAL  - discussion note visible only to team staff (default for UI).
 *   EXTERNAL  - notes printed on customer invoices / vendor dispatches.
 *   SYSTEM    - automatically logged by backend event triggers.
 *
 * SYSTEM is reserved for backend-generated notes and must never be accepted
 * from user input (enforced at the use-case layer). The other three are the
 * categories a user may pick from the UI. Mirrors the Purchase Request thread.
 */
export const PURCHASE_ORDER_COMMENT_CATEGORIES = [
  'APPROVAL',
  'INTERNAL',
  'EXTERNAL',
  'SYSTEM',
] as const;

export type PurchaseOrderCommentCategory =
  (typeof PURCHASE_ORDER_COMMENT_CATEGORIES)[number];

/** Categories a user may set from the UI (SYSTEM excluded). */
export const USER_ASSIGNABLE_COMMENT_CATEGORIES: PurchaseOrderCommentCategory[] = [
  'INTERNAL',
  'APPROVAL',
  'EXTERNAL',
];

export function isPurchaseOrderCommentCategory(
  value: unknown,
): value is PurchaseOrderCommentCategory {
  return (
    typeof value === 'string' &&
    (PURCHASE_ORDER_COMMENT_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isUserAssignableCommentCategory(
  value: PurchaseOrderCommentCategory,
): boolean {
  return USER_ASSIGNABLE_COMMENT_CATEGORIES.includes(value);
}
