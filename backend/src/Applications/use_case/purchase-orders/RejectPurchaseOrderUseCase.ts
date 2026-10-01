import { PurchaseOrder } from '../../../Domains/purchase-orders/entities/PurchaseOrder';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';

/**
 * UseCase: RejectPurchaseOrderUseCase — SUBMITTED -> REJECTED.
 *
 * A rejection reason is mandatory. The note is normalised and, when empty,
 * the request is refused with REJECT_PURCHASE_ORDER.NOTE_REQUIRED.
 */
export class RejectPurchaseOrderUseCase {
  constructor(private readonly purchaseOrderRepository: PurchaseOrderRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder> {
    const normalised = note ? note.trim() : '';
    if (!normalised) {
      throw new Error('REJECT_PURCHASE_ORDER.NOTE_REQUIRED');
    }
    return this.purchaseOrderRepository.reject(id, companyId, userId, normalised);
  }
}
