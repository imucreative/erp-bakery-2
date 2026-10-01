import {
  UploadPurchaseOrderAttachment,
  UploadedFileInput,
} from '../../../Domains/purchase-orders/entities/UploadPurchaseOrderAttachment';
import { PurchaseOrderAttachment } from '../../../Domains/purchase-orders/entities/PurchaseOrderAttachment';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';
import { PurchaseOrderAttachmentStorage } from '../../../Domains/purchase-orders/PurchaseOrderAttachmentStorage';

/**
 * UseCase: UploadPurchaseOrderAttachmentUseCase
 *
 * Attaches a file to a Purchase Order (doc 35 §5). Flow:
 *   1. Validate the file (present, allowed MIME, extension consistent,
 *      size <= 5 MB) via UploadPurchaseOrderAttachment BEFORE any IO.
 *   2. Enforce tenant scope: the PO must exist within the caller's company
 *      (repository.getById resolves the PO number and throws
 *      PURCHASE_ORDER.NOT_FOUND for a foreign/absent PO).
 *   3. Write the bytes to storage (safe server-derived name), then persist the
 *      metadata row. If the DB write fails after the file was written, the
 *      orphan file is removed so storage never diverges from metadata.
 *
 * Storage-first-then-DB ordering is deliberate: a stored file with no DB row is
 * recoverable (we clean it up on DB failure); a DB row with no file would be a
 * broken download.
 *
 * Mirrors UploadPurchaseRequestAttachmentUseCase exactly.
 */
export class UploadPurchaseOrderAttachmentUseCase {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly storage: PurchaseOrderAttachmentStorage,
  ) {}

  async execute(
    purchaseOrderId: string,
    file: UploadedFileInput,
    companyId: string,
    uploadedBy: string | null,
  ): Promise<PurchaseOrderAttachment> {
    const validated = new UploadPurchaseOrderAttachment(file);

    // Tenant scope + resolve PO number for the stored file name prefix.
    const po = await this.purchaseOrderRepository.getById(purchaseOrderId, companyId);

    const stored = await this.storage.save(
      po.poNumber,
      validated.originalName,
      validated.mimeType,
      validated.buffer,
    );

    try {
      return await this.purchaseOrderRepository.addAttachment(
        purchaseOrderId,
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
