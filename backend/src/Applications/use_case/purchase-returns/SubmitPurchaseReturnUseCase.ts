import { PurchaseReturn } from '../../../Domains/purchase-returns/entities/PurchaseReturn';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';

/**
 * UseCase: SubmitPurchaseReturnUseCase — DRAFT -> SUBMITTED (doc 26 §6 #18).
 *
 * Submitting reserves the returnable quantity. The repository performs the
 * status transition and re-derives the returnable quantity authoritatively
 * (posted − completed − submitted, excluding this return) to reject any line
 * whose returnQuantity exceeds it. No stock moves on submit — the RETURN
 * reversal is posted on complete. The optional note is attached to the
 * DRAFT -> SUBMITTED status-log row.
 */
export class SubmitPurchaseReturnUseCase {
  constructor(private readonly purchaseReturnRepository: PurchaseReturnRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn> {
    const normalised = note ? note.trim() : null;
    return this.purchaseReturnRepository.submit(id, companyId, userId, normalised);
  }
}
