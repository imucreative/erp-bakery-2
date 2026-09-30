import { PurchaseRequest } from '../../../Domains/purchase-requests/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';

/**
 * UseCase: CancelPurchaseRequestUseCase — DRAFT|REJECTED -> CANCELLED.
 *
 * Cancelling soft-deletes the document (deleted_at) and marks it terminal.
 * The cancellation note is optional.
 */
export class CancelPurchaseRequestUseCase {
  constructor(private readonly purchaseRequestRepository: PurchaseRequestRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest> {
    const normalised = note ? note.trim() : null;
    return this.purchaseRequestRepository.cancel(id, companyId, userId, normalised);
  }
}
