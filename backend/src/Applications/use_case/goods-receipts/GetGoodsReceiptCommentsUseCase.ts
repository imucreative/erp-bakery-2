import { GoodsReceiptComment } from '../../../Domains/goods-receipts/entities/GoodsReceiptComment';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';

/**
 * UseCase: GetGoodsReceiptCommentsUseCase — list a GR discussion thread
 * chronologically. Enforces tenant scope (the GR must belong to the caller's
 * company) before returning the thread.
 */
export class GetGoodsReceiptCommentsUseCase {
  constructor(private readonly goodsReceiptRepository: GoodsReceiptRepository) {}

  async execute(
    goodsReceiptId: string,
    companyId: string,
  ): Promise<GoodsReceiptComment[]> {
    await this.goodsReceiptRepository.ensureExists(goodsReceiptId, companyId);
    return this.goodsReceiptRepository.listComments(goodsReceiptId, companyId);
  }
}
