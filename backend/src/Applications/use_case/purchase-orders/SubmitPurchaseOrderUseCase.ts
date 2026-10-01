import { PurchaseOrder } from '../../../Domains/purchase-orders/entities/PurchaseOrder';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';

/**
 * UseCase: SubmitPurchaseOrderUseCase — DRAFT -> SUBMITTED.
 */
export class SubmitPurchaseOrderUseCase {
  constructor(private readonly purchaseOrderRepository: PurchaseOrderRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<PurchaseOrder> {
    return this.purchaseOrderRepository.submit(id, companyId, userId);
  }
}
