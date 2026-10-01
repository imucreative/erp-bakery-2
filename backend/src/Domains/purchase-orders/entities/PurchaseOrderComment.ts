import { PurchaseOrderCommentCategory } from '../purchaseOrderCommentCategory';

/**
 * Domain Entity: PurchaseOrderComment (read value object).
 *
 * A single message on a PO discussion thread. `authorName` is resolved via a
 * JOIN to users at the repository layer and may be null when the author user
 * no longer exists (author_id is SET NULL on user delete).
 */
export interface PurchaseOrderComment {
  id: string;
  category: PurchaseOrderCommentCategory;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
}
