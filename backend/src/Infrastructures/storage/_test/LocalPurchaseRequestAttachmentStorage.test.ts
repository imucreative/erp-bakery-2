import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalPurchaseRequestAttachmentStorage } from '../LocalPurchaseRequestAttachmentStorage';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

describe('LocalPurchaseRequestAttachmentStorage', () => {
  let root: string;
  let storage: LocalPurchaseRequestAttachmentStorage;

  beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pr-att-'));
    storage = new LocalPurchaseRequestAttachmentStorage(root);
  });

  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
  });

  it('saves a file under uploads/purchase-request/<year>/ with a safe derived name', async () => {
    const { storedPath } = await storage.save(
      'PR-OUT001-2026-000001',
      'quote.pdf',
      'application/pdf',
      Buffer.from('%PDF data'),
    );

    const year = String(new Date().getFullYear());
    expect(storedPath.startsWith(`uploads/purchase-request/${year}/`)).toBe(true);
    // derived name keeps the PR number prefix and pdf extension, not the raw name
    expect(storedPath.endsWith('.pdf')).toBe(true);
    expect(storedPath).toContain('PR-OUT001-2026-000001');
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
    // The stored path stays inside uploads/purchase-request and has no ".."
    expect(storedPath).not.toContain('..');
    expect(storedPath.startsWith('uploads/purchase-request/')).toBe(true);
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
      'PR-1',
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
      'PR-1',
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
