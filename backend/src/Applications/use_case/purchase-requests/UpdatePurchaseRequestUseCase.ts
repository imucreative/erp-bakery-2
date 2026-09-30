import { UpdatePurchaseRequest } from '../../../Domains/purchase-requests/entities/UpdatePurchaseRequest';
import { PurchaseRequest } from '../../../Domains/purchase-requests/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: UpdatePurchaseRequestUseCase — edit an editable PR (DRAFT/REJECTED).
 *
 * Validation and company-scope reference checks mirror create. The repository
 * enforces the editable-status gate and, when the PR was REJECTED, resets it
 * to DRAFT while logging the transition.
 */
export class UpdatePurchaseRequestUseCase {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly outletRepository: OutletRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
  ) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<PurchaseRequest> {
    const draft = new UpdatePurchaseRequest(payload);

    await this.outletRepository.getOutletById(draft.destinationOutletId, companyId);

    const productIds = [...new Set(draft.items.map((i) => i.productId))];
    const uomIds = [...new Set(draft.items.map((i) => i.uomId))];
    await Promise.all(productIds.map((pid) => this.productRepository.getProductById(pid, companyId)));
    await Promise.all(uomIds.map((uid) => this.uomRepository.getUomById(uid, companyId)));

    return this.purchaseRequestRepository.updateDraft(id, companyId, userId, {
      destinationOutletId: draft.destinationOutletId,
      expectedDate: draft.expectedDate,
      notes: draft.notes,
      items: draft.items,
      totalEstimatedAmount: draft.totalEstimatedAmount,
    });
  }
}
