import { PurchaseRequestAttachment } from '../../../Domains/purchase-requests/entities/PurchaseRequestAttachment';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';

/**
 * UseCase: ListPurchaseRequestAttachmentsUseCase — list a PR's attachments
 * chronologically. Enforces tenant scope (the PR must belong to the caller's
 * company) before returning metadata. Never exposes the internal stored path.
 */
export class ListPurchaseRequestAttachmentsUseCase {
  constructor(private readonly purchaseRequestRepository: PurchaseRequestRepository) {}

  async execute(
    purchaseRequestId: string,
    companyId: string,
  ): Promise<PurchaseRequestAttachment[]> {
    await this.purchaseRequestRepository.ensureExists(purchaseRequestId, companyId);
    return this.purchaseRequestRepository.listAttachments(purchaseRequestId, companyId);
  }
}
