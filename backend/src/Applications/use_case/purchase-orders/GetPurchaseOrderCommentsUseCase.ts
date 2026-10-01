import { PurchaseOrderComment } from '../../../Domains/purchase-orders/entities/PurchaseOrderComment';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';

/**
 * UseCase: GetPurchaseOrderCommentsUseCase — list a PO discussion thread
 * chronologically. Enforces tenant scope (the PO must belong to the caller's
 * company) before returning the thread.
 */
export class GetPurchaseOrderCommentsUseCase {
  constructor(private readonly purchaseOrderRepository: PurchaseOrderRepository) {}

  async execute(
    purchaseOrderId: string,
    companyId: string,
  ): Promise<PurchaseOrderComment[]> {
    await this.purchaseOrderRepository.ensureExists(purchaseOrderId, companyId);
    return this.purchaseOrderRepository.listComments(purchaseOrderId, companyId);
  }
}
