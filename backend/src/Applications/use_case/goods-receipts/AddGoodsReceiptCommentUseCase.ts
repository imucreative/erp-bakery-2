import { AddGoodsReceiptComment } from '../../../Domains/goods-receipts/entities/AddGoodsReceiptComment';
import { GoodsReceiptComment } from '../../../Domains/goods-receipts/entities/GoodsReceiptComment';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';

/**
 * UseCase: AddGoodsReceiptCommentUseCase
 *
 * Adds a manual comment to a GR discussion thread (doc 35 §6). Flow:
 *   1. Validate payload (body non-empty; category defaults to INTERNAL;
 *      SYSTEM rejected — it is backend-only) via AddGoodsReceiptComment.
 *   2. Enforce tenant scope: the GR must exist within the caller's company
 *      (repository.ensureExists throws GOODS_RECEIPT.NOT_FOUND otherwise).
 *   3. Persist and return the comment with the resolved author name.
 *
 * Note: the comment thread is intentionally separate from the approval
 * timeline (status logs). Status transitions keep writing their own log rows;
 * this use case never touches the timeline.
 */
export class AddGoodsReceiptCommentUseCase {
  constructor(private readonly goodsReceiptRepository: GoodsReceiptRepository) {}

  async execute(
    goodsReceiptId: string,
    payload: unknown,
    companyId: string,
    authorId: string | null,
  ): Promise<GoodsReceiptComment> {
    const comment = new AddGoodsReceiptComment(payload);

    await this.goodsReceiptRepository.ensureExists(goodsReceiptId, companyId);

    return this.goodsReceiptRepository.addComment(goodsReceiptId, companyId, authorId, {
      category: comment.category,
      body: comment.body,
    });
  }
}
