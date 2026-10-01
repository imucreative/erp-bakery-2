/**
 * Domain Entity: PurchaseOrderAttachment (read value object).
 *
 * Metadata for a file attached to a Purchase Order (doc 35 §5). The binary
 * itself lives on disk; `storedPath` is the safe server-derived relative path
 * and is intentionally NOT exposed in the HTTP response — clients download via
 * the dedicated endpoint. `uploadedByName` is resolved via a LEFT JOIN to
 * users and may be null when the uploader no longer exists.
 */
export interface PurchaseOrderAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: Date;
}

/**
 * Attachment metadata including the internal storedPath. Returned by the
 * repository's getAttachmentById so the download use case can stream the file;
 * never serialized directly to the HTTP client.
 */
export interface PurchaseOrderAttachmentWithPath extends PurchaseOrderAttachment {
  storedPath: string;
}
