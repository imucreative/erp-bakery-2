import { PurchaseRequest } from '../../../Domains/purchase-requests/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';

/**
 * UseCase: ApprovePurchaseRequestUseCase — SUBMITTED -> APPROVED.
 *
 * Nominal-based approval limits are deferred (project decision): any user
 * holding `procurement.pr.approve` may approve any amount. The approval note
 * is optional.
 */
export class ApprovePurchaseRequestUseCase {
  constructor(private readonly purchaseRequestRepository: PurchaseRequestRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest> {
    return this.purchaseRequestRepository.approve(id, companyId, userId, note);
  }
}
