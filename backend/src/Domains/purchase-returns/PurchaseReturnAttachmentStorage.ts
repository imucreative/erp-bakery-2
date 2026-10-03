/**
 * Storage port for Purchase Return attachments (doc 35 §5).
 *
 * Abstracts the physical file store (local disk in dev, S3/GCS in prod) so the
 * use cases stay free of fs/IO concerns and can be unit-tested with a mock.
 * The repository owns metadata; this port owns bytes.
 */
export interface StoredAttachmentFile {
  /** Server-derived relative path, e.g. uploads/purchase-returns/2026/<uuid>.pdf */
  storedPath: string;
}

export abstract class PurchaseReturnAttachmentStorage {
  /**
   * Persist the file bytes under the module's storage root and return the safe
   * relative stored path. The stored name is derived by the implementation
   * (never from the raw original name) to prevent path traversal.
   */
  abstract save(
    returnNumber: string,
    originalName: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<StoredAttachmentFile>;

  /** Remove a previously stored file. Missing files are ignored (idempotent). */
  abstract remove(storedPath: string): Promise<void>;

  /**
   * Resolve a stored relative path to an absolute path for streaming, ensuring
   * the resolved path stays inside the storage root (defense-in-depth against
   * traversal). Throws when the path escapes the root.
   */
  abstract resolveAbsolutePath(storedPath: string): string;

  /** Open a readable stream for a stored file (used by the download endpoint). */
  abstract createReadStream(storedPath: string): NodeJS.ReadableStream;
}
