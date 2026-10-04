import {
  UploadPurchaseReturnAttachment,
  UploadedFileInput,
} from '../../../Domains/purchase-returns/entities/UploadPurchaseReturnAttachment';
import { PurchaseReturnAttachment } from '../../../Domains/purchase-returns/entities/PurchaseReturnAttachment';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';
import { PurchaseReturnAttachmentStorage } from '../../../Domains/purchase-returns/PurchaseReturnAttachmentStorage';

/**
 * UseCase: UploadPurchaseReturnAttachmentUseCase
 *
 * Attaches a file to a Purchase Return (doc 35 §5). Flow:
 *   1. Validate the file (present, allowed MIME, extension consistent,
 *      size <= 5 MB) via UploadPurchaseReturnAttachment BEFORE any IO.
 *   2. Enforce tenant scope: the return must exist within the caller's company
 *      (repository.getById resolves the return number and throws
 *      PURCHASE_RETURN.NOT_FOUND for a foreign/absent return).
 *   3. Write the bytes to storage (safe server-derived name), then persist the
 *      metadata row. If the DB write fails after the file was written, the
 *      orphan file is removed so storage never diverges from metadata.
 *
 * Storage-first-then-DB ordering is deliberate: a stored file with no DB row is
 * recoverable (we clean it up on DB failure); a DB row with no file would be a
 * broken download.
 *
 * Mirrors UploadGoodsReceiptAttachmentUseCase exactly.
 */
export class UploadPurchaseReturnAttachmentUseCase {
  constructor(
    private readonly purchaseReturnRepository: PurchaseReturnRepository,
    private readonly storage: PurchaseReturnAttachmentStorage,
  ) {}

  async execute(
    purchaseReturnId: string,
    file: UploadedFileInput,
    companyId: string,
    uploadedBy: string | null,
  ): Promise<PurchaseReturnAttachment> {
    const validated = new UploadPurchaseReturnAttachment(file);

    // Tenant scope + resolve return number for the stored file name prefix.
    const pr = await this.purchaseReturnRepository.getById(purchaseReturnId, companyId);

    const stored = await this.storage.save(
      pr.returnNumber,
      validated.originalName,
      validated.mimeType,
      validated.buffer,
    );

    try {
      return await this.purchaseReturnRepository.addAttachment(
        purchaseReturnId,
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
