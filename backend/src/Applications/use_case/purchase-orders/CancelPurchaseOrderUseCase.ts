import { PurchaseOrder } from '../../../Domains/purchase-orders/entities/PurchaseOrder';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';

/**
 * UseCase: CancelPurchaseOrderUseCase — DRAFT|REJECTED|APPROVED -> CANCELLED.
 *
 * Cancelling soft-deletes the document (deleted_at) and marks it terminal.
 * The cancellation note is optional.
 */
export class CancelPurchaseOrderUseCase {
  constructor(private readonly purchaseOrderRepository: PurchaseOrderRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseOrder> {
    const normalised = note ? note.trim() : null;
    return this.purchaseOrderRepository.cancel(id, companyId, userId, normalised);
  }
}
