import { AddPurchaseReturnComment } from '../../../Domains/purchase-returns/entities/AddPurchaseReturnComment';
import { PurchaseReturnComment } from '../../../Domains/purchase-returns/entities/PurchaseReturnComment';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';

/**
 * UseCase: AddPurchaseReturnCommentUseCase
 *
 * Adds a manual comment to a Purchase Return discussion thread (doc 35 §6).
 * Flow:
 *   1. Validate payload (body non-empty; category defaults to INTERNAL;
 *      SYSTEM rejected — it is backend-only) via AddPurchaseReturnComment.
 *   2. Enforce tenant scope: the return must exist within the caller's company
 *      (repository.ensureExists throws PURCHASE_RETURN.NOT_FOUND otherwise).
 *   3. Persist and return the comment with the resolved author name.
 *
 * Note: the comment thread is intentionally separate from the approval
 * timeline (status logs). Status transitions keep writing their own log rows;
 * this use case never touches the timeline.
 */
export class AddPurchaseReturnCommentUseCase {
  constructor(private readonly purchaseReturnRepository: PurchaseReturnRepository) {}

  async execute(
    purchaseReturnId: string,
    payload: unknown,
    companyId: string,
    authorId: string | null,
  ): Promise<PurchaseReturnComment> {
    const comment = new AddPurchaseReturnComment(payload);

    await this.purchaseReturnRepository.ensureExists(purchaseReturnId, companyId);

    return this.purchaseReturnRepository.addComment(purchaseReturnId, companyId, authorId, {
      category: comment.category,
      body: comment.body,
    });
  }
}
