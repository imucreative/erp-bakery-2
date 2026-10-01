import {
  UploadGoodsReceiptAttachment,
  UploadedFileInput,
} from '../../../Domains/goods-receipts/entities/UploadGoodsReceiptAttachment';
import { GoodsReceiptAttachment } from '../../../Domains/goods-receipts/entities/GoodsReceiptAttachment';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { GoodsReceiptAttachmentStorage } from '../../../Domains/goods-receipts/GoodsReceiptAttachmentStorage';

/**
 * UseCase: UploadGoodsReceiptAttachmentUseCase
 *
 * Attaches a file to a Goods Receipt (doc 35 §5). Flow:
 *   1. Validate the file (present, allowed MIME, extension consistent,
 *      size <= 5 MB) via UploadGoodsReceiptAttachment BEFORE any IO.
 *   2. Enforce tenant scope: the GR must exist within the caller's company
 *      (repository.getById resolves the GR number and throws
 *      GOODS_RECEIPT.NOT_FOUND for a foreign/absent GR).
 *   3. Write the bytes to storage (safe server-derived name), then persist the
 *      metadata row. If the DB write fails after the file was written, the
 *      orphan file is removed so storage never diverges from metadata.
 *
 * Storage-first-then-DB ordering is deliberate: a stored file with no DB row is
 * recoverable (we clean it up on DB failure); a DB row with no file would be a
 * broken download.
 *
 * Mirrors UploadPurchaseOrderAttachmentUseCase exactly.
 */
export class UploadGoodsReceiptAttachmentUseCase {
  constructor(
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly storage: GoodsReceiptAttachmentStorage,
  ) {}

  async execute(
    goodsReceiptId: string,
    file: UploadedFileInput,
    companyId: string,
    uploadedBy: string | null,
  ): Promise<GoodsReceiptAttachment> {
    const validated = new UploadGoodsReceiptAttachment(file);

    // Tenant scope + resolve GR number for the stored file name prefix.
    const gr = await this.goodsReceiptRepository.getById(goodsReceiptId, companyId);

    const stored = await this.storage.save(
      gr.grNumber,
      validated.originalName,
      validated.mimeType,
      validated.buffer,
    );

    try {
      return await this.goodsReceiptRepository.addAttachment(
        goodsReceiptId,
        companyId,
        uploadedBy,
        {
          originalName: validated.originalName,
          storedPath: stored.storedPath,
          mimeType: validated.mimeType,
          sizeBytes: validated.sizeBytes,
        },
      );
    } catch (err) {
      // Roll back the orphan file so storage stays consistent with metadata.
      await this.storage.remove(stored.storedPath).catch(() => undefined);
      throw err;
    }
  }
}
