import { AddPurchaseOrderComment } from '../../../Domains/purchase-orders/entities/AddPurchaseOrderComment';
import { PurchaseOrderComment } from '../../../Domains/purchase-orders/entities/PurchaseOrderComment';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';

/**
 * UseCase: AddPurchaseOrderCommentUseCase
 *
 * Adds a manual comment to a PO discussion thread (doc 35 §6). Flow:
 *   1. Validate payload (body non-empty; category defaults to INTERNAL;
 *      SYSTEM rejected — it is backend-only) via AddPurchaseOrderComment.
 *   2. Enforce tenant scope: the PO must exist within the caller's company
 *      (repository.ensureExists throws PURCHASE_ORDER.NOT_FOUND otherwise).
 *   3. Persist and return the comment with the resolved author name.
 *
 * Note: the comment thread is intentionally separate from the approval
 * timeline (status logs). Status transitions keep writing their own log rows;
 * this use case never touches the timeline.
 */
export class AddPurchaseOrderCommentUseCase {
  constructor(private readonly purchaseOrderRepository: PurchaseOrderRepository) {}

  async execute(
    purchaseOrderId: string,
    payload: unknown,
    companyId: string,
    authorId: string | null,
  ): Promise<PurchaseOrderComment> {
    const comment = new AddPurchaseOrderComment(payload);

    await this.purchaseOrderRepository.ensureExists(purchaseOrderId, companyId);

    return this.purchaseOrderRepository.addComment(purchaseOrderId, companyId, authorId, {
      category: comment.category,
      body: comment.body,
    });
  }
}
