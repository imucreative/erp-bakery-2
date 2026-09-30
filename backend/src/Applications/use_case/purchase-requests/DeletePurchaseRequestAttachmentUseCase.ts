import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';
import { PurchaseRequestAttachmentStorage } from '../../../Domains/purchase-requests/PurchaseRequestAttachmentStorage';

/**
 * UseCase: DeletePurchaseRequestAttachmentUseCase — remove an attachment.
 *
 * The repository delete is company + PR scoped (IDOR guard) and returns the
 * deleted row (including stored path). The metadata row is removed first; the
 * physical file is removed afterwards. Deleting the row first means a failure
 * to unlink the file (transient IO error) leaves at most an orphan file, which
 * is far safer than a dangling DB row pointing at a missing file. The storage
 * remove is idempotent (missing files are ignored).
 */
export class DeletePurchaseRequestAttachmentUseCase {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly storage: PurchaseRequestAttachmentStorage,
  ) {}

  async execute(
    purchaseRequestId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<void> {
    const deleted = await this.purchaseRequestRepository.deleteAttachment(
      purchaseRequestId,
      attachmentId,
      companyId,
    );
    await this.storage.remove(deleted.storedPath);
  }
}
