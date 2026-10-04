import {
  PurchaseReturnCommentCategory,
  isPurchaseReturnCommentCategory,
  isUserAssignableCommentCategory,
} from '../purchaseReturnCommentCategory';

/**
 * Domain Entity: AddPurchaseReturnComment
 *
 * Validates the payload for adding a manual comment to a Purchase Return thread
 * (doc 35 §6). Rules:
 *   - body is required and must be non-empty after trimming.
 *   - category defaults to INTERNAL when omitted.
 *   - category must be a known category; SYSTEM is reserved for backend
 *     events and is rejected from user input (only INTERNAL/APPROVAL/EXTERNAL
 *     are user-assignable).
 */
export class AddPurchaseReturnComment {
  public readonly body: string;
  public readonly category: PurchaseReturnCommentCategory;

  constructor(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('ADD_PURCHASE_RETURN_COMMENT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (p.body === undefined || p.body === null || typeof p.body !== 'string') {
      throw new Error('ADD_PURCHASE_RETURN_COMMENT.BODY_REQUIRED');
    }
    const body = p.body.trim();
    if (body.length === 0) {
      throw new Error('ADD_PURCHASE_RETURN_COMMENT.BODY_REQUIRED');
    }

    let category: PurchaseReturnCommentCategory = 'INTERNAL';
    if (p.category !== undefined && p.category !== null && p.category !== '') {
      if (!isPurchaseReturnCommentCategory(p.category)) {
        throw new Error('ADD_PURCHASE_RETURN_COMMENT.INVALID_CATEGORY');
      }
      if (!isUserAssignableCommentCategory(p.category)) {
        // SYSTEM is backend-only.
        throw new Error('ADD_PURCHASE_RETURN_COMMENT.CATEGORY_NOT_ALLOWED');
      }
      category = p.category;
    }

    this.body = body;
    this.category = category;
  }
}
