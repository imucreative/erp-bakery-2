import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { GoodsReceiptAttachmentStorage } from '../../../Domains/goods-receipts/GoodsReceiptAttachmentStorage';

/**
 * UseCase: DeleteGoodsReceiptAttachmentUseCase — remove an attachment.
 *
 * The repository delete is company + GR scoped (IDOR guard) and returns the
 * deleted row (including stored path). The metadata row is removed first; the
 * physical file is removed afterwards. Deleting the row first means a failure
 * to unlink the file (transient IO error) leaves at most an orphan file, which
 * is far safer than a dangling DB row pointing at a missing file. The storage
 * remove is idempotent (missing files are ignored).
 */
export class DeleteGoodsReceiptAttachmentUseCase {
  constructor(
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly storage: GoodsReceiptAttachmentStorage,
  ) {}

  async execute(
    goodsReceiptId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<void> {
    const deleted = await this.goodsReceiptRepository.deleteAttachment(
      goodsReceiptId,
      attachmentId,
      companyId,
    );
    await this.storage.remove(deleted.storedPath);
  }
}
