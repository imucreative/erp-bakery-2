import {
  UploadPurchaseRequestAttachment,
  UploadedFileInput,
} from '../../../Domains/purchase-requests/entities/UploadPurchaseRequestAttachment';
import { PurchaseRequestAttachment } from '../../../Domains/purchase-requests/entities/PurchaseRequestAttachment';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';
import { PurchaseRequestAttachmentStorage } from '../../../Domains/purchase-requests/PurchaseRequestAttachmentStorage';

/**
 * UseCase: UploadPurchaseRequestAttachmentUseCase
 *
 * Attaches a file to a Purchase Request (doc 35 §5). Flow:
 *   1. Validate the file (present, allowed MIME, extension consistent,
 *      size <= 5 MB) via UploadPurchaseRequestAttachment BEFORE any IO.
 *   2. Enforce tenant scope: the PR must exist within the caller's company
 *      (repository.getById resolves the PR number and throws
 *      PURCHASE_REQUEST.NOT_FOUND for a foreign/absent PR).
 *   3. Write the bytes to storage (safe server-derived name), then persist the
 *      metadata row. If the DB write fails after the file was written, the
 *      orphan file is removed so storage never diverges from metadata.
 *
 * Storage-first-then-DB ordering is deliberate: a stored file with no DB row is
 * recoverable (we clean it up on DB failure); a DB row with no file would be a
 * broken download.
 */
export class UploadPurchaseRequestAttachmentUseCase {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly storage: PurchaseRequestAttachmentStorage,
  ) {}

  async execute(
    purchaseRequestId: string,
    file: UploadedFileInput,
    companyId: string,
    uploadedBy: string | null,
  ): Promise<PurchaseRequestAttachment> {
    const validated = new UploadPurchaseRequestAttachment(file);

    // Tenant scope + resolve PR number for the stored file name prefix.
    const pr = await this.purchaseRequestRepository.getById(purchaseRequestId, companyId);

    const stored = await this.storage.save(
      pr.prNumber,
      validated.originalName,
      validated.mimeType,
      validated.buffer,
    );

    try {
      return await this.purchaseRequestRepository.addAttachment(
        purchaseRequestId,
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
