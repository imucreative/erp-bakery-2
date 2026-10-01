import { GoodsReceipt } from '../../../Domains/goods-receipts/entities/GoodsReceipt';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';

/**
 * UseCase: CancelGoodsReceiptUseCase — DRAFT -> CANCELLED.
 *
 * Cancelling soft-deletes the document (deleted_at) and marks it terminal. A
 * COMPLETED GR cannot be cancelled (the status VO rejects the transition). The
 * cancellation note is optional.
 */
export class CancelGoodsReceiptUseCase {
  constructor(private readonly goodsReceiptRepository: GoodsReceiptRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<GoodsReceipt> {
    const normalised = note ? note.trim() : null;
    return this.goodsReceiptRepository.cancel(id, companyId, userId, normalised);
  }
}
