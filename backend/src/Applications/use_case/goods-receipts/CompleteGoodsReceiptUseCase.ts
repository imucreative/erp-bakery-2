import { GoodsReceipt } from '../../../Domains/goods-receipts/entities/GoodsReceipt';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';

/**
 * UseCase: CompleteGoodsReceiptUseCase — DRAFT -> COMPLETED (Stage 2).
 *
 * Completing a Goods Receipt posts its ACCEPTED line quantities into inventory
 * and marks the document terminal. The repository performs the whole operation
 * ATOMICALLY in one transaction (lock GR, resolve-or-create batches, append
 * PURCHASE movements, flip status + inventory_posted_at + status log) — Opsi A.
 * If posting fails the GR is NOT marked COMPLETED.
 *
 * Idempotency is handled in the repository: completing an already-COMPLETED GR
 * returns it unchanged (idempotent success) rather than double-posting; the
 * database source-key unique index is the final guard. Only ACCEPTED quantities
 * post (rejected quantities never create stock — doc 26 §6.12, doc 27 §6 #4).
 *
 * The batch/expiry requirement for accepted batch-tracked products was already
 * enforced at create/update time, so no re-validation is needed here. The
 * optional note is attached to the DRAFT -> COMPLETED status-log row.
 */
export class CompleteGoodsReceiptUseCase {
  constructor(private readonly goodsReceiptRepository: GoodsReceiptRepository) {}

  async execute(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<GoodsReceipt> {
    const normalised = note ? note.trim() : null;
    return this.goodsReceiptRepository.complete(id, companyId, userId, normalised);
  }
}
