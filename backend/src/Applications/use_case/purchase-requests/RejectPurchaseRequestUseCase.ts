import { PurchaseRequest } from '../../../Domains/purchase-requests/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';

/**
 * UseCase: RejectPurchaseRequestUseCase — SUBMITTED -> REJECTED.
 *
 * A rejection reason is mandatory (doc 43 §4). The note is normalised and,
 * when empty, the request is refused with REJECT_PURCHASE_REQUEST.NOTE_REQUIRED.
 */
export class RejectPurchaseRequestUseCase {
  constructor(private readonly purchaseRequestRepository: PurchaseRequestRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest> {
    const normalised = note ? note.trim() : '';
    if (!normalised) {
      throw new Error('REJECT_PURCHASE_REQUEST.NOTE_REQUIRED');
    }
    return this.purchaseRequestRepository.reject(id, companyId, userId, normalised);
  }
}
