import { PurchaseReturn } from '../../../Domains/purchase-returns/entities/PurchaseReturn';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';

/**
 * UseCase: CancelPurchaseReturnUseCase — DRAFT|SUBMITTED -> CANCELLED
 * (doc 26 §6 #18).
 *
 * Cancelling a SUBMITTED return releases its reservation (the submitted-
 * reservation sum no longer counts this return). Mirrors the GR convention
 * (Opsi A): CANCELLED is terminal, stays visible, and does NOT soft-delete the
 * row. The optional note is attached to the CANCELLED status-log row. The
 * repository rejects an invalid transition (e.g. a COMPLETED return) with
 * PURCHASE_RETURN.INVALID_STATUS_TRANSITION.
 */
export class CancelPurchaseReturnUseCase {
  constructor(private readonly purchaseReturnRepository: PurchaseReturnRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn> {
    const normalised = note ? note.trim() : null;
    return this.purchaseReturnRepository.cancel(id, companyId, userId, normalised);
  }
}
