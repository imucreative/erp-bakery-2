import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';
import { PurchaseOrderAttachmentStorage } from '../../../Domains/purchase-orders/PurchaseOrderAttachmentStorage';

/**
 * UseCase: DeletePurchaseOrderAttachmentUseCase — remove an attachment.
 *
 * The repository delete is company + PO scoped (IDOR guard) and returns the
 * deleted row (including stored path). The metadata row is removed first; the
 * physical file is removed afterwards. Deleting the row first means a failure
 * to unlink the file (transient IO error) leaves at most an orphan file, which
 * is far safer than a dangling DB row pointing at a missing file. The storage
 * remove is idempotent (missing files are ignored).
 */
export class DeletePurchaseOrderAttachmentUseCase {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly storage: PurchaseOrderAttachmentStorage,
  ) {}

  async execute(
    purchaseOrderId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<void> {
    const deleted = await this.purchaseOrderRepository.deleteAttachment(
      purchaseOrderId,
      attachmentId,
      companyId,
    );
    await this.storage.remove(deleted.storedPath);
  }
}
