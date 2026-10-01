/**
 * Attachment policy for Goods Receipts (doc 35 §5 Reusable Attachment
 * Standard). Centralizes the allowed MIME types, the max file size, and the
 * MIME↔extension consistency rules so the use case, DTO/Swagger, and tests all
 * share one source of truth.
 *
 * Mirrors the Purchase Order attachment policy; kept module-local so the GR
 * attachment stack stays self-contained and independently evolvable.
 */

/** Allowed MIME types — PDF, JPEG, PNG only (doc 35 §5). */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedAttachmentMimeType = (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

/** Max file size — 5 MB per file (doc 35 §5). */
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Canonical file extension for each allowed MIME type. Used both to derive the
 * safe stored file name and to verify the client-reported extension is
 * consistent with the reported MIME type (defense against extension/mime
 * spoofing). JPEG accepts both .jpg and .jpeg.
 */
const MIME_EXTENSIONS: Record<AllowedAttachmentMimeType, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};

export function isAllowedAttachmentMimeType(
  value: unknown,
): value is AllowedAttachmentMimeType {
  return (
    typeof value === 'string' &&
    (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(value)
  );
}

/**
 * The canonical extension (without dot) used to build the stored file name for
 * a given allowed MIME type.
 */
export function canonicalExtensionForMime(mime: AllowedAttachmentMimeType): string {
  return MIME_EXTENSIONS[mime][0];
}

/**
 * Extract a lowercased extension (without dot) from a file name, or '' when the
 * name has no extension.
 */
export function extractExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0 || dot === fileName.length - 1) {
    return '';
  }
  return fileName.slice(dot + 1).toLowerCase();
}

/**
 * True when the file-name extension is consistent with the reported MIME type.
 * An empty/absent extension is treated as consistent (we trust the validated
 * MIME and derive the stored extension ourselves).
 */
export function isExtensionConsistentWithMime(
  fileName: string,
  mime: AllowedAttachmentMimeType,
): boolean {
  const ext = extractExtension(fileName);
  if (ext === '') {
    return true;
  }
  return MIME_EXTENSIONS[mime].includes(ext);
}
