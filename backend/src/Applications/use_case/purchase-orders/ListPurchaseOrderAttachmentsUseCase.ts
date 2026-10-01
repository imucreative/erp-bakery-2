import { PurchaseOrderAttachment } from '../../../Domains/purchase-orders/entities/PurchaseOrderAttachment';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';

/**
 * UseCase: ListPurchaseOrderAttachmentsUseCase — list a PO's attachments
 * chronologically. Enforces tenant scope (the PO must belong to the caller's
 * company) before returning metadata. Never exposes the internal stored path.
 */
export class ListPurchaseOrderAttachmentsUseCase {
  constructor(private readonly purchaseOrderRepository: PurchaseOrderRepository) {}

  async execute(
    purchaseOrderId: string,
    companyId: string,
  ): Promise<PurchaseOrderAttachment[]> {
    await this.purchaseOrderRepository.ensureExists(purchaseOrderId, companyId);
    return this.purchaseOrderRepository.listAttachments(purchaseOrderId, companyId);
  }
}
