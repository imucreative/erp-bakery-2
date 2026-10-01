import { GoodsReceiptCommentCategory } from '../goodsReceiptCommentCategory';

/**
 * Domain Entity: GoodsReceiptComment (read value object).
 *
 * A single message on a GR discussion thread. `authorName` is resolved via a
 * JOIN to users at the repository layer and may be null when the author user
 * no longer exists (author_id is SET NULL on user delete).
 */
export interface GoodsReceiptComment {
  id: string;
  category: GoodsReceiptCommentCategory;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
}
