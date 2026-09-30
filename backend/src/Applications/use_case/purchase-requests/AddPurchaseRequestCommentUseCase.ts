import { AddPurchaseRequestComment } from '../../../Domains/purchase-requests/entities/AddPurchaseRequestComment';
import { PurchaseRequestComment } from '../../../Domains/purchase-requests/entities/PurchaseRequestComment';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';

/**
 * UseCase: AddPurchaseRequestCommentUseCase
 *
 * Adds a manual comment to a PR discussion thread (doc 35 §6). Flow:
 *   1. Validate payload (body non-empty; category defaults to INTERNAL;
 *      SYSTEM rejected — it is backend-only) via AddPurchaseRequestComment.
 *   2. Enforce tenant scope: the PR must exist within the caller's company
 *      (repository.ensureExists throws PURCHASE_REQUEST.NOT_FOUND otherwise).
 *   3. Persist and return the comment with the resolved author name.
 *
 * Note: the comment thread is intentionally separate from the approval
 * timeline (status logs). Status transitions keep writing their own log rows;
 * this use case never touches the timeline.
 */
export class AddPurchaseRequestCommentUseCase {
  constructor(private readonly purchaseRequestRepository: PurchaseRequestRepository) {}

  async execute(
    purchaseRequestId: string,
    payload: unknown,
    companyId: string,
    authorId: string | null,
  ): Promise<PurchaseRequestComment> {
    const comment = new AddPurchaseRequestComment(payload);

    await this.purchaseRequestRepository.ensureExists(purchaseRequestId, companyId);

    return this.purchaseRequestRepository.addComment(purchaseRequestId, companyId, authorId, {
      category: comment.category,
      body: comment.body,
    });
  }
}
