import { PurchaseRequest } from '../../../Domains/purchase-requests/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';

/**
 * UseCase: SubmitPurchaseRequestUseCase — DRAFT -> SUBMITTED.
 */
export class SubmitPurchaseRequestUseCase {
  constructor(private readonly purchaseRequestRepository: PurchaseRequestRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<PurchaseRequest> {
    return this.purchaseRequestRepository.submit(id, companyId, userId);
  }
}
