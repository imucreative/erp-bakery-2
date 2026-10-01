import { GoodsReceiptAttachmentWithPath } from '../../../Domains/goods-receipts/entities/GoodsReceiptAttachment';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { GoodsReceiptAttachmentStorage } from '../../../Domains/goods-receipts/GoodsReceiptAttachmentStorage';

/**
 * Result of resolving an attachment for download: the metadata (including the
 * internal stored path, needed to open the stream) plus a ready-to-consume
 * readable stream of the file bytes.
 */
export interface GoodsReceiptAttachmentDownload {
  attachment: GoodsReceiptAttachmentWithPath;
  stream: NodeJS.ReadableStream;
}

/**
 * UseCase: GetGoodsReceiptAttachmentUseCase — resolve a single attachment for
 * download. Scopes the lookup to BOTH the GR id and the company id at the
 * repository layer (IDOR guard), so an attachment can only be served through
 * the GR it belongs to inside the caller's tenant. Opens the file stream via
 * the storage port, which re-validates the path stays inside the storage root.
 */
export class GetGoodsReceiptAttachmentUseCase {
  constructor(
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly storage: GoodsReceiptAttachmentStorage,
  ) {}

  async execute(
    goodsReceiptId: string,
    attachmentId: string,
    companyId: string,
  ): Promise<GoodsReceiptAttachmentDownload> {
    const attachment = await this.goodsReceiptRepository.getAttachmentById(
      goodsReceiptId,
      attachmentId,
      companyId,
    );
    const stream = this.storage.createReadStream(attachment.storedPath);
    return { attachment, stream };
  }
}
