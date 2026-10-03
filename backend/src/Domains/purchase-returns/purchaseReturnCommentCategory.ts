/**
 * Purchase Return comment categories (global-erp-standards doc 35 §6).
 *
 *   APPROVAL  - written by supervisors during Approve/Reject actions.
 *   INTERNAL  - discussion note visible only to team staff (default for UI).
 *   EXTERNAL  - notes printed on customer invoices / vendor dispatches.
 *   SYSTEM    - automatically logged by backend event triggers.
 *
 * SYSTEM is reserved for backend-generated notes and must never be accepted
 * from user input (enforced at the use-case layer). The other three are the
 * categories a user may pick from the UI. Mirrors the Goods Receipt thread.
 */
export const PURCHASE_RETURN_COMMENT_CATEGORIES = [
  'APPROVAL',
  'INTERNAL',
  'EXTERNAL',
  'SYSTEM',
] as const;

export type PurchaseReturnCommentCategory =
  (typeof PURCHASE_RETURN_COMMENT_CATEGORIES)[number];

/** Categories a user may set from the UI (SYSTEM excluded). */
export const USER_ASSIGNABLE_COMMENT_CATEGORIES: PurchaseReturnCommentCategory[] = [
  'INTERNAL',
  'APPROVAL',
  'EXTERNAL',
];

export function isPurchaseReturnCommentCategory(
  value: unknown,
): value is PurchaseReturnCommentCategory {
  return (
    typeof value === 'string' &&
    (PURCHASE_RETURN_COMMENT_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isUserAssignableCommentCategory(
  value: PurchaseReturnCommentCategory,
): boolean {
  return USER_ASSIGNABLE_COMMENT_CATEGORIES.includes(value);
}
