import { createReadStream, promises as fsp } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  GoodsReceiptAttachmentStorage,
  StoredAttachmentFile,
} from '../../Domains/goods-receipts/GoodsReceiptAttachmentStorage';
import {
  AllowedAttachmentMimeType,
  canonicalExtensionForMime,
  isAllowedAttachmentMimeType,
} from '../../Domains/goods-receipts/goodsReceiptAttachmentPolicy';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

/**
 * Local-disk implementation of the GR attachment storage port (doc 35 §5).
 *
 * Files land under <root>/uploads/goods-receipt/<year>/ where <root>
 * defaults to the backend process cwd. The stored file name is derived
 * server-side as "<GR-NUMBER>-<timestamp>-<uuid>.<ext>" — the raw original
 * name is NEVER used to build the path, and the GR number is sanitized to a
 * conservative charset, so path traversal is impossible.
 *
 * Stored paths are always kept relative (POSIX separators) in the DB so they
 * are portable; resolveAbsolutePath re-anchors them to the storage root and
 * verifies the result never escapes it.
 *
 * Mirrors LocalPurchaseOrderAttachmentStorage; only the module directory
 * differs (goods-receipt).
 */
const MODULE_DIR = 'goods-receipt';

export class LocalGoodsReceiptAttachmentStorage extends GoodsReceiptAttachmentStorage {
  private readonly root: string;

  constructor(root?: string) {
    super();
    // Storage root: <backend>/uploads. UPLOAD_ROOT can override for tests/prod.
    this.root = path.resolve(root ?? process.env.UPLOAD_ROOT ?? process.cwd(), 'uploads');
  }

  async save(
    grNumber: string,
    originalName: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<StoredAttachmentFile> {
    if (!isAllowedAttachmentMimeType(mimeType)) {
      // Defensive: the use case validates first, but never trust the extension.
      throw new Error('UPLOAD_GOODS_RECEIPT_ATTACHMENT.MIME_NOT_ALLOWED');
    }
    const year = String(new Date().getFullYear());
    const dirAbsolute = path.join(this.root, MODULE_DIR, year);
    await fsp.mkdir(dirAbsolute, { recursive: true });

    const ext = canonicalExtensionForMime(mimeType as AllowedAttachmentMimeType);
    const safePrefix = this._sanitize(grNumber);
    const fileName = `${safePrefix}-${Date.now()}-${randomUUID()}.${ext}`;
    const absolutePath = path.join(dirAbsolute, fileName);

    await fsp.writeFile(absolutePath, buffer);

    // Store a relative POSIX path for portability.
    const relative = path
      .relative(this.root, absolutePath)
      .split(path.sep)
      .join('/');
    return { storedPath: `uploads/${relative}` };
  }

  async remove(storedPath: string): Promise<void> {
    let absolutePath: string;
    try {
      absolutePath = this.resolveAbsolutePath(storedPath);
    } catch {
      // Path escaped the root — refuse to touch anything outside storage.
      return;
    }
    try {
      await fsp.unlink(absolutePath);
    } catch (err) {
      // Missing file is fine (idempotent delete); rethrow anything else.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  resolveAbsolutePath(storedPath: string): string {
    // Stored paths are "uploads/..."; strip the leading "uploads/" so we can
    // re-anchor to this.root (which already ends in /uploads).
    const withoutPrefix = storedPath.replace(/^uploads[\\/]/, '');
    const absolutePath = path.resolve(this.root, withoutPrefix);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;
    if (absolutePath !== this.root && !absolutePath.startsWith(rootWithSep)) {
      throw new NotFoundError('GOODS_RECEIPT_ATTACHMENT.NOT_FOUND');
    }
    return absolutePath;
  }

  createReadStream(storedPath: string): NodeJS.ReadableStream {
    return createReadStream(this.resolveAbsolutePath(storedPath));
  }

  /** Reduce an arbitrary string to a filesystem-safe token (no dots/traversal). */
  private _sanitize(value: string): string {
    const cleaned = value
      .replace(/[^A-Za-z0-9_-]+/g, '-') // keep only word chars + dash (drops dots/slashes)
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned.length > 0 ? cleaned.slice(0, 80) : 'GR';
  }
}
