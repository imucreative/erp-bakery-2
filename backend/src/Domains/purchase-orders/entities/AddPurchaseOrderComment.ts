import {
  PurchaseOrderCommentCategory,
  isPurchaseOrderCommentCategory,
  isUserAssignableCommentCategory,
} from '../purchaseOrderCommentCategory';

/**
 * Domain Entity: AddPurchaseOrderComment
 *
 * Validates the payload for adding a manual comment to a PO thread
 * (doc 35 §6). Rules:
 *   - body is required and must be non-empty after trimming.
 *   - category defaults to INTERNAL when omitted.
 *   - category must be a known category; SYSTEM is reserved for backend
 *     events and is rejected from user input (only INTERNAL/APPROVAL/EXTERNAL
 *     are user-assignable).
 */
export class AddPurchaseOrderComment {
  public readonly body: string;
  public readonly category: PurchaseOrderCommentCategory;

  constructor(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('ADD_PURCHASE_ORDER_COMMENT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (p.body === undefined || p.body === null || typeof p.body !== 'string') {
      throw new Error('ADD_PURCHASE_ORDER_COMMENT.BODY_REQUIRED');
    }
    const body = p.body.trim();
    if (body.length === 0) {
      throw new Error('ADD_PURCHASE_ORDER_COMMENT.BODY_REQUIRED');
    }

    let category: PurchaseOrderCommentCategory = 'INTERNAL';
    if (p.category !== undefined && p.category !== null && p.category !== '') {
      if (!isPurchaseOrderCommentCategory(p.category)) {
        throw new Error('ADD_PURCHASE_ORDER_COMMENT.INVALID_CATEGORY');
      }
      if (!isUserAssignableCommentCategory(p.category)) {
        // SYSTEM is backend-only.
        throw new Error('ADD_PURCHASE_ORDER_COMMENT.CATEGORY_NOT_ALLOWED');
      }
      category = p.category;
    }

    this.body = body;
    this.category = category;
  }
}
