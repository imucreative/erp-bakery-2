import { GoodsReceiptAttachment } from '../../../Domains/goods-receipts/entities/GoodsReceiptAttachment';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';

/**
 * UseCase: ListGoodsReceiptAttachmentsUseCase — list a GR's attachments
 * chronologically. Enforces tenant scope (the GR must belong to the caller's
 * company) before returning metadata. Never exposes the internal stored path.
 */
export class ListGoodsReceiptAttachmentsUseCase {
  constructor(private readonly goodsReceiptRepository: GoodsReceiptRepository) {}

  async execute(
    goodsReceiptId: string,
    companyId: string,
  ): Promise<GoodsReceiptAttachment[]> {
    await this.goodsReceiptRepository.ensureExists(goodsReceiptId, companyId);
    return this.goodsReceiptRepository.listAttachments(goodsReceiptId, companyId);
  }
}
