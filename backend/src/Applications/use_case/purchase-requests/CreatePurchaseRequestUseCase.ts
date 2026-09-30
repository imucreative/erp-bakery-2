import { CreatePurchaseRequest } from '../../../Domains/purchase-requests/entities/CreatePurchaseRequest';
import { PurchaseRequest } from '../../../Domains/purchase-requests/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: CreatePurchaseRequestUseCase
 *
 * 1. Validate payload + compute subtotals/total (CreatePurchaseRequest)
 * 2. Verify destination outlet, every product, and every UOM belong to the
 *    company (company-scope; each getById throws *.NOT_FOUND otherwise)
 * 3. Persist DRAFT (repository generates pr_number and logs null -> DRAFT)
 */
export class CreatePurchaseRequestUseCase {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly outletRepository: OutletRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
  ) {}

  async execute(
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<PurchaseRequest> {
    const draft = new CreatePurchaseRequest(payload);

    // Company-scope validation of references (throws OUTLET/PRODUCT/UOM.NOT_FOUND)
    await this.outletRepository.getOutletById(draft.destinationOutletId, companyId);

    const productIds = [...new Set(draft.items.map((i) => i.productId))];
    const uomIds = [...new Set(draft.items.map((i) => i.uomId))];
    await Promise.all(productIds.map((id) => this.productRepository.getProductById(id, companyId)));
    await Promise.all(uomIds.map((id) => this.uomRepository.getUomById(id, companyId)));

    return this.purchaseRequestRepository.createDraft(companyId, userId, {
      destinationOutletId: draft.destinationOutletId,
      expectedDate: draft.expectedDate,
      notes: draft.notes,
      items: draft.items,
      totalEstimatedAmount: draft.totalEstimatedAmount,
    });
  }
}
