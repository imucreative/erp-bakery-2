import { PurchaseRequestComment } from '../../../Domains/purchase-requests/entities/PurchaseRequestComment';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';

/**
 * UseCase: GetPurchaseRequestCommentsUseCase — list a PR discussion thread
 * chronologically. Enforces tenant scope (the PR must belong to the caller's
 * company) before returning the thread.
 */
export class GetPurchaseRequestCommentsUseCase {
  constructor(private readonly purchaseRequestRepository: PurchaseRequestRepository) {}

  async execute(
    purchaseRequestId: string,
    companyId: string,
  ): Promise<PurchaseRequestComment[]> {
    await this.purchaseRequestRepository.ensureExists(purchaseRequestId, companyId);
    return this.purchaseRequestRepository.listComments(purchaseRequestId, companyId);
  }
}
