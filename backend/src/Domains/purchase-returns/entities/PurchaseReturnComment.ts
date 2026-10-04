import { PurchaseReturnCommentCategory } from '../purchaseReturnCommentCategory';

/**
 * Domain Entity: PurchaseReturnComment (read value object).
 *
 * A single message on a Purchase Return discussion thread. `authorName` is
 * resolved via a JOIN to users at the repository layer and may be null when the
 * author user no longer exists (author_id is SET NULL on user delete).
 */
export interface PurchaseReturnComment {
  id: string;
  category: PurchaseReturnCommentCategory;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
}
