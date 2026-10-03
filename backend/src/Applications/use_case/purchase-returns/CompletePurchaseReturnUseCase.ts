import { PurchaseReturn } from '../../../Domains/purchase-returns/entities/PurchaseReturn';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';

/**
 * UseCase: CompletePurchaseReturnUseCase — SUBMITTED -> COMPLETED (doc 26 §6 #19).
 *
 * Completing posts the RETURN inventory reversal (outbound) for each line and
 * marks the document terminal. The repository performs the whole operation
 * ATOMICALLY in one SERIALIZABLE transaction (lock return, reload each source
 * batch FOR UPDATE, reject INVENTORY.INSUFFICIENT_STOCK when the batch balance
 * is below the return quantity, append RETURN movements with the deterministic
 * source key, decrement balances, flip status + completed audit + status log).
 * If posting fails the return is NOT marked COMPLETED.
 *
 * Idempotency is handled in the repository: completing an already-COMPLETED
 * return returns it unchanged (idempotent success); the database source-key
 * unique index is the final guard against a double reversal. The optional note
 * is attached to the SUBMITTED -> COMPLETED status-log row.
 */
export class CompletePurchaseReturnUseCase {
  constructor(private readonly purchaseReturnRepository: PurchaseReturnRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseReturn> {
    const normalised = note ? note.trim() : null;
    return this.purchaseReturnRepository.complete(id, companyId, userId, normalised);
  }
}
