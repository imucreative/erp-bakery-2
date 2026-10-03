import { PurchaseReturnAttachment } from '../../../Domains/purchase-returns/entities/PurchaseReturnAttachment';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';

/**
 * UseCase: ListPurchaseReturnAttachmentsUseCase — list a Purchase Return's
 * attachments chronologically. Enforces tenant scope (the return must belong to
 * the caller's company) before returning metadata. Never exposes the internal
 * stored path.
 */
export class ListPurchaseReturnAttachmentsUseCase {
  constructor(private readonly purchaseReturnRepository: PurchaseReturnRepository) {}

  async execute(
    purchaseReturnId: string,
    companyId: string,
  ): Promise<PurchaseReturnAttachment[]> {
    await this.purchaseReturnRepository.ensureExists(purchaseReturnId, companyId);
    return this.purchaseReturnRepository.listAttachments(purchaseReturnId, companyId);
  }
}
