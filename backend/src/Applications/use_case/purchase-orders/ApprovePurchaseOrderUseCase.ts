import { PurchaseOrder } from '../../../Domains/purchase-orders/entities/PurchaseOrder';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';

/**
 * UseCase: ApprovePurchaseOrderUseCase — SUBMITTED -> APPROVED.
 *
 * Nominal-based approval limits are deferred (project decision): any user
 * holding `procurement.po.approve` may approve any amount. The approval note
 * is optional.
 */
export class ApprovePurchaseOrderUseCase {
  constructor(private readonly purchaseOrderRepository: PurchaseOrderRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder> {
    const normalised = note ? note.trim() : null;
    return this.purchaseOrderRepository.approve(id, companyId, userId, normalised);
  }
}
