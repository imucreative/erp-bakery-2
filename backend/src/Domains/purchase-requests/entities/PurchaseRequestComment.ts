import { PurchaseRequestCommentCategory } from '../purchaseRequestCommentCategory';

/**
 * Domain Entity: PurchaseRequestComment (read value object).
 *
 * A single message on a PR discussion thread. `authorName` is resolved via a
 * JOIN to users at the repository layer and may be null when the author user
 * no longer exists (author_id is SET NULL on user delete).
 */
export interface PurchaseRequestComment {
  id: string;
  category: PurchaseRequestCommentCategory;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
}
