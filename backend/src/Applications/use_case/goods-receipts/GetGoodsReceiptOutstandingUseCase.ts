import {
  buildOutstandingMap,
  OutstandingPoItem,
  SourcePoItem,
} from '../../../Domains/goods-receipts/entities/CreateGoodsReceipt';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';

export interface GoodsReceiptOutstandingResult {
  purchaseOrderId: string;
  items: OutstandingPoItem[];
}

/**
 * UseCase: GetGoodsReceiptOutstandingUseCase
 *
 * Exposes, per PO line, how much quantity remains to be received on a NEW (or
 * being edited) GR. The frontend uses this to drive the receive form and the
 * per-line max received quantity so it mirrors the backend-authoritative rule.
 *
 * outstanding(poItem) = qtyPO − Σ(accepted + rejected of that PO line in
 * consuming sibling GRs). Consuming = DRAFT, COMPLETED. CANCELLED releases
 * consumption. In edit mode the caller passes excludeGoodsReceiptId so the
 * edited GR's own consumption is not counted against itself.
 *
 * All reads are company-scoped: the PO is loaded via the company-scoped PO
 * repository (404 for a foreign/missing PO), and consumption is summed only
 * within the same company. The PO is NOT required to be APPROVED here (the
 * frontend may inspect outstanding before the receive flow); creation itself
 * enforces APPROVED.
 */
export class GetGoodsReceiptOutstandingUseCase {
  constructor(
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
  ) {}

  async execute(
    purchaseOrderId: string,
    companyId: string,
    excludeGoodsReceiptId?: string,
  ): Promise<GoodsReceiptOutstandingResult> {
    // Company-scoped PO load; throws PURCHASE_ORDER.NOT_FOUND if foreign.
    const po = await this.purchaseOrderRepository.getById(purchaseOrderId, companyId);

    const sourcePoItems: SourcePoItem[] = po.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      uomId: i.uomId,
    }));
    const consumedByPoItem = await this.goodsReceiptRepository.getConsumedQtyByPoItem(
      purchaseOrderId,
      companyId,
      excludeGoodsReceiptId,
    );
    const items = buildOutstandingMap(sourcePoItems, consumedByPoItem);

    return { purchaseOrderId, items };
  }
}
