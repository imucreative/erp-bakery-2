import {
  AllowedAttachmentMimeType,
  MAX_ATTACHMENT_SIZE_BYTES,
  isAllowedAttachmentMimeType,
  isExtensionConsistentWithMime,
} from '../purchaseOrderAttachmentPolicy';

/**
 * Raw uploaded-file input handed to the domain validator. The controller maps
 * the multipart part into this shape; the domain layer stays free of any
 * Fastify/HTTP types.
 */
export interface UploadedFileInput {
  originalName: unknown;
  mimeType: unknown;
  /** In-memory buffer of the file content (already read by the controller). */
  buffer: Buffer;
}

/**
 * Domain Entity: UploadPurchaseOrderAttachment
 *
 * Validates an uploaded file against the Reusable Attachment Standard
 * (doc 35 §5) BEFORE it is written to disk:
 *   - a file must be present (non-empty buffer);
 *   - originalName is required and non-empty after trimming;
 *   - mimeType must be one of application/pdf, image/jpeg, image/png;
 *   - the file-name extension (when present) must be consistent with the
 *     reported MIME type — defends against extension/mime spoofing;
 *   - size must be > 0 and <= 5 MB.
 *
 * Note: this validates the client-reported MIME type plus extension
 * consistency. Deeper magic-byte sniffing can be layered later; the multipart
 * config also enforces the byte limit at the transport layer as a second gate.
 */
export class UploadPurchaseOrderAttachment {
  public readonly originalName: string;
  public readonly mimeType: AllowedAttachmentMimeType;
  public readonly buffer: Buffer;
  public readonly sizeBytes: number;

  constructor(input: UploadedFileInput) {
    if (!input || !Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
      throw new Error('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_REQUIRED');
    }

    if (
      input.originalName === undefined ||
      input.originalName === null ||
      typeof input.originalName !== 'string'
    ) {
      throw new Error('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_REQUIRED');
    }
    const originalName = input.originalName.trim();
    if (originalName.length === 0) {
      throw new Error('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_REQUIRED');
    }

    if (!isAllowedAttachmentMimeType(input.mimeType)) {
      throw new Error('UPLOAD_PURCHASE_ORDER_ATTACHMENT.MIME_NOT_ALLOWED');
    }

    if (!isExtensionConsistentWithMime(originalName, input.mimeType)) {
      throw new Error('UPLOAD_PURCHASE_ORDER_ATTACHMENT.MIME_NOT_ALLOWED');
    }

    if (input.buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_TOO_LARGE');
    }

    this.originalName = originalName.slice(0, 255);
    this.mimeType = input.mimeType;
    this.buffer = input.buffer;
    this.sizeBytes = input.buffer.length;
  }
}
