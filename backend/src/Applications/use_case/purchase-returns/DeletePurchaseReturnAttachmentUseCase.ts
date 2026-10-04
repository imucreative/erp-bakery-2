import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';
import { PurchaseReturnAttachmentStorage } from '../../../Domains/purchase-returns/PurchaseReturnAttachmentStorage';

/**
 * UseCase: DeletePurchaseReturnAttachmentUseCase — remove an attachment.
 *
 * The repository delete is company + return scoped (IDOR guard) and returns the
 * deleted row (including stored path). The metadata row is removed first; the
 * physical file is removed afterwards. Deleting the row first means a failure
 * to unlink the file (transient IO error) leaves at most an orphan file, which
 * is far safer than a dangling DB row pointing at a missing file. The storage
 * remove is idempotent (missing files are ignored).
 */
export class DeletePurchaseReturnAttachmentUseCase {
  constructor(
    private readonly purchaseReturnRepository: PurchaseReturnRepository,
    private readonly storage: PurchaseReturnAttachmentStorage,
  ) {}

  async execute(
    purchaseReturnId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<void> {
    const deleted = await this.purchaseReturnRepository.deleteAttachment(
      purchaseReturnId,
      attachmentId,
      companyId,
    );
    await this.storage.remove(deleted.storedPath);
  }
}
