import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalPurchaseReturnAttachmentStorage } from '../LocalPurchaseReturnAttachmentStorage';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

describe('LocalPurchaseReturnAttachmentStorage', () => {
  let root: string;
  let storage: LocalPurchaseReturnAttachmentStorage;

  beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pr-att-'));
    storage = new LocalPurchaseReturnAttachmentStorage(root);
  });

  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
  });

  it('saves a file under uploads/purchase-returns/<year>/ with a safe derived name', async () => {
    const { storedPath } = await storage.save(
      'RTN-2026-000001',
      'return-note.pdf',
      'application/pdf',
      Buffer.from('%PDF data'),
    );

    const year = String(new Date().getFullYear());
    expect(storedPath.startsWith(`uploads/purchase-returns/${year}/`)).toBe(true);
    // derived name keeps the return number prefix and pdf extension, not the raw name
    expect(storedPath.endsWith('.pdf')).toBe(true);
    expect(storedPath).toContain('RTN-2026-000001');
    // and the bytes are actually on disk
    const absolute = storage.resolveAbsolutePath(storedPath);
    await expect(fsp.readFile(absolute, 'utf8')).resolves.toBe('%PDF data');
  });

  it('never uses the raw original name for the path (path traversal defense)', async () => {
    const { storedPath } = await storage.save(
      '../../etc/passwd',
      '../../evil.png',
      'image/png',
      Buffer.from('PNG'),
    );
    // The stored path stays inside uploads/purchase-returns and has no ".."
    expect(storedPath).not.toContain('..');
    expect(storedPath.startsWith('uploads/purchase-returns/')).toBe(true);
    // resolveAbsolutePath keeps it inside the root
    const absolute = storage.resolveAbsolutePath(storedPath);
    expect(absolute.startsWith(path.resolve(root, 'uploads'))).toBe(true);
  });

  it('resolveAbsolutePath rejects a path escaping the storage root', () => {
    expect(() => storage.resolveAbsolutePath('uploads/../../../etc/passwd')).toThrow(
      NotFoundError,
    );
  });

  it('remove deletes the file and is idempotent for a missing file', async () => {
    const { storedPath } = await storage.save(
      'RTN-1',
      'x.png',
      'image/png',
      Buffer.from('PNG'),
    );
    const absolute = storage.resolveAbsolutePath(storedPath);
    await storage.remove(storedPath);
    await expect(fsp.access(absolute)).rejects.toBeDefined();
    // second remove does not throw
    await expect(storage.remove(storedPath)).resolves.toBeUndefined();
  });

  it('remove silently ignores paths outside the root', async () => {
    await expect(storage.remove('uploads/../../../etc/passwd')).resolves.toBeUndefined();
  });

  it('createReadStream streams the stored bytes', async () => {
    const { storedPath } = await storage.save(
      'RTN-1',
      'x.pdf',
      'application/pdf',
      Buffer.from('hello'),
    );
    const stream = storage.createReadStream(storedPath);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c) => chunks.push(Buffer.from(c)));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });
    expect(Buffer.concat(chunks).toString('utf8')).toBe('hello');
  });
});
