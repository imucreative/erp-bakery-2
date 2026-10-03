import { PurchaseReturnAttachmentWithPath } from '../../../Domains/purchase-returns/entities/PurchaseReturnAttachment';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';
import { PurchaseReturnAttachmentStorage } from '../../../Domains/purchase-returns/PurchaseReturnAttachmentStorage';

/**
 * Result of resolving an attachment for download: the metadata (including the
 * internal stored path, needed to open the stream) plus a ready-to-consume
 * readable stream of the file bytes.
 */
export interface PurchaseReturnAttachmentDownload {
  attachment: PurchaseReturnAttachmentWithPath;
  stream: NodeJS.ReadableStream;
}

/**
 * UseCase: GetPurchaseReturnAttachmentUseCase — resolve a single attachment for
 * download. Scopes the lookup to BOTH the return id and the company id at the
 * repository layer (IDOR guard), so an attachment can only be served through
 * the return it belongs to inside the caller's tenant. Opens the file stream
 * via the storage port, which re-validates the path stays inside the storage
 * root.
 */
export class GetPurchaseReturnAttachmentUseCase {
  constructor(
    private readonly purchaseReturnRepository: PurchaseReturnRepository,
    private readonly storage: PurchaseReturnAttachmentStorage,
  ) {}

  async execute(
    purchaseReturnId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseReturnAttachmentDownload> {
    const attachment = await this.purchaseReturnRepository.getAttachmentById(
      purchaseReturnId,
      attachmentId,
      companyId,
    );
    const stream = this.storage.createReadStream(attachment.storedPath);
    return { attachment, stream };
  }
}
