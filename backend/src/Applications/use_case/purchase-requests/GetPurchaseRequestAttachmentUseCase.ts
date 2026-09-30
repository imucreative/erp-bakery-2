import { PurchaseRequestAttachmentWithPath } from '../../../Domains/purchase-requests/entities/PurchaseRequestAttachment';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';
import { PurchaseRequestAttachmentStorage } from '../../../Domains/purchase-requests/PurchaseRequestAttachmentStorage';

/**
 * Result of resolving an attachment for download: the metadata (including the
 * internal stored path, needed to open the stream) plus a ready-to-consume
 * readable stream of the file bytes.
 */
export interface PurchaseRequestAttachmentDownload {
  attachment: PurchaseRequestAttachmentWithPath;
  stream: NodeJS.ReadableStream;
}

/**
 * UseCase: GetPurchaseRequestAttachmentUseCase — resolve a single attachment
 * for download. Scopes the lookup to BOTH the PR id and the company id at the
 * repository layer (IDOR guard), so an attachment can only be served through
 * the PR it belongs to inside the caller's tenant. Opens the file stream via
 * the storage port, which re-validates the path stays inside the storage root.
 */
export class GetPurchaseRequestAttachmentUseCase {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly storage: PurchaseRequestAttachmentStorage,
  ) {}

  async execute(
    purchaseRequestId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseRequestAttachmentDownload> {
    const attachment = await this.purchaseRequestRepository.getAttachmentById(
      purchaseRequestId,
      attachmentId,
      companyId,
    );
    const stream = this.storage.createReadStream(attachment.storedPath);
    return { attachment, stream };
  }
}
