import {
  PurchaseReturnRepository,
  ReturnableLine,
} from '../../../Domains/purchase-returns/PurchaseReturnRepository';

export interface ReturnableResult {
  goodsReceiptId: string;
  items: ReturnableLine[];
}

/**
 * UseCase: GetReturnableUseCase
 *
 * Exposes the returnable lines for a source Goods Receipt so the frontend can
 * drive the return form and the per-line max returnable quantity (doc 26 §6
 * #14–#16/#18). The GR must be COMPLETED (its accepted quantities were posted);
 * the repository throws PURCHASE_RETURN.GOODS_RECEIPT_NOT_COMPLETED otherwise
 * and 404s a foreign/missing GR. All reads are company-scoped.
 *
 * returnableQuantity(grItem) =
 *   postedAcceptedQuantity − completedReturnQuantity − submittedReturnQuantity,
 * derived from the GR's posted accepted PURCHASE movements (never the GR item
 * snapshot).
 */
export class GetReturnableUseCase {
  constructor(private readonly purchaseReturnRepository: PurchaseReturnRepository) {}

  async execute(goodsReceiptId: string, companyId: string): Promise<ReturnableResult> {
    const items = await this.purchaseReturnRepository.getReturnable(goodsReceiptId, companyId);
    return { goodsReceiptId, items };
  }
}
