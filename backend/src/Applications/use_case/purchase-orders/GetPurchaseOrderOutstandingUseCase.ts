import {
  buildOutstandingMap,
  OutstandingPrItem,
} from '../../../Domains/purchase-orders/entities/CreatePurchaseOrder';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';

/**
 * A single PR line's outstanding (remaining orderable) quota, enriched with the
 * UOM and estimated price so the frontend can prefill a new PO line without an
 * extra PR fetch.
 */
export interface PurchaseOrderOutstandingItem extends OutstandingPrItem {
  uomId: string;
  estimatedPrice: number;
}

export interface PurchaseOrderOutstandingResult {
  purchaseRequestId: string;
  items: PurchaseOrderOutstandingItem[];
}

/**
 * UseCase: GetPurchaseOrderOutstandingUseCase
 *
 * Exposes, per PR line, how much quota remains to be ordered on a NEW (or being
 * edited) PO. The frontend uses this to drive the "add from PR item" dropdown
 * and the per-line max quantity so it mirrors the backend-authoritative rule.
 *
 * outstanding(prItem) = qtyPR − Σ(qty of that product in ACTIVE sibling POs)
 *
 * ACTIVE = DRAFT, SUBMITTED, APPROVED. CANCELLED and REJECTED release quota.
 * In edit mode the caller passes excludePurchaseOrderId so the edited PO's own
 * consumption is not counted against itself. All reads are company-scoped: the
 * PR is loaded via the company-scoped PR repository (404 for a foreign/missing
 * PR), and consumption is summed only within the same company.
 */
export class GetPurchaseOrderOutstandingUseCase {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
  ) {}

  async execute(
    purchaseRequestId: string,
    companyId: string,
    excludePurchaseOrderId?: string,
  ): Promise<PurchaseOrderOutstandingResult> {
    // Company-scoped PR load; throws PURCHASE_REQUEST.NOT_FOUND if foreign.
    const pr = await this.purchaseRequestRepository.getById(purchaseRequestId, companyId);

    const consumedByProduct = await this.purchaseOrderRepository.getConsumedQtyByPrItem(
      purchaseRequestId,
      companyId,
      excludePurchaseOrderId,
    );
    const outstanding = buildOutstandingMap(pr.items, consumedByProduct);

    const items: PurchaseOrderOutstandingItem[] = outstanding.map((line) => {
      const prItem = pr.items.find((i) => i.productId === line.productId)!;
      return {
        ...line,
        uomId: prItem.uomId,
        estimatedPrice: prItem.estimatedPrice,
      };
    });

    return { purchaseRequestId, items };
  }
}
