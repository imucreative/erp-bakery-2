import { PurchaseOrderAttachmentWithPath } from '../../../Domains/purchase-orders/entities/PurchaseOrderAttachment';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';
import { PurchaseOrderAttachmentStorage } from '../../../Domains/purchase-orders/PurchaseOrderAttachmentStorage';

/**
 * Result of resolving an attachment for download: the metadata (including the
 * internal stored path, needed to open the stream) plus a ready-to-consume
 * readable stream of the file bytes.
 */
export interface PurchaseOrderAttachmentDownload {
  attachment: PurchaseOrderAttachmentWithPath;
  stream: NodeJS.ReadableStream;
}

/**
 * UseCase: GetPurchaseOrderAttachmentUseCase — resolve a single attachment for
 * download. Scopes the lookup to BOTH the PO id and the company id at the
 * repository layer (IDOR guard), so an attachment can only be served through
 * the PO it belongs to inside the caller's tenant. Opens the file stream via
 * the storage port, which re-validates the path stays inside the storage root.
 */
export class GetPurchaseOrderAttachmentUseCase {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly storage: PurchaseOrderAttachmentStorage,
  ) {}

  async execute(
    purchaseOrderId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<PurchaseOrderAttachmentDownload> {
    const attachment = await this.purchaseOrderRepository.getAttachmentById(
      purchaseOrderId,
      attachmentId,
      companyId,
    );
    const stream = this.storage.createReadStream(attachment.storedPath);
    return { attachment, stream };
  }
}
