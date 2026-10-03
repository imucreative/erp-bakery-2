import { UploadPurchaseReturnAttachmentUseCase } from '../UploadPurchaseReturnAttachmentUseCase';
import { ListPurchaseReturnAttachmentsUseCase } from '../ListPurchaseReturnAttachmentsUseCase';
import { GetPurchaseReturnAttachmentUseCase } from '../GetPurchaseReturnAttachmentUseCase';
import { DeletePurchaseReturnAttachmentUseCase } from '../DeletePurchaseReturnAttachmentUseCase';
import { UploadPurchaseReturnAttachment } from '../../../../Domains/purchase-returns/entities/UploadPurchaseReturnAttachment';
import { PurchaseReturnRepository } from '../../../../Domains/purchase-returns/PurchaseReturnRepository';
import { PurchaseReturnAttachmentStorage } from '../../../../Domains/purchase-returns/PurchaseReturnAttachmentStorage';
import { MAX_ATTACHMENT_SIZE_BYTES } from '../../../../Domains/purchase-returns/purchaseReturnAttachmentPolicy';

/**
 * Unit tests for the Purchase Return attachment use cases (Tahap 2). Mirrors the
 * Goods Receipt attachment tests: domain file validation, storage-first-then-DB
 * ordering with orphan cleanup, tenant scope via getById/ensureExists, and IDOR
 * scoping (return + company) for download/delete.
 */
const prRepo: jest.Mocked<PurchaseReturnRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  getReturnable: jest.fn(),
  submit: jest.fn(),
  complete: jest.fn(),
  cancel: jest.fn(),
  ensureExists: jest.fn(),
  addComment: jest.fn(),
  listComments: jest.fn(),
  addAttachment: jest.fn(),
  listAttachments: jest.fn(),
  getAttachmentById: jest.fn(),
  deleteAttachment: jest.fn(),
} as unknown as jest.Mocked<PurchaseReturnRepository>;

const storage: jest.Mocked<PurchaseReturnAttachmentStorage> = {
  save: jest.fn(),
  remove: jest.fn(),
  resolveAbsolutePath: jest.fn(),
  createReadStream: jest.fn(),
} as unknown as jest.Mocked<PurchaseReturnAttachmentStorage>;

beforeEach(() => jest.clearAllMocks());

const pdf = {
  originalName: 'return-note.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 data'),
};

describe('UploadPurchaseReturnAttachment (domain validation)', () => {
  it('should accept a valid PDF and expose trimmed metadata', () => {
    const vo = new UploadPurchaseReturnAttachment({
      originalName: '  return-note.pdf  ',
      mimeType: 'application/pdf',
      buffer: Buffer.from('data'),
    });
    expect(vo.originalName).toBe('return-note.pdf');
    expect(vo.mimeType).toBe('application/pdf');
    expect(vo.sizeBytes).toBe(4);
  });

  it('should reject a missing/empty file', () => {
    expect(
      () =>
        new UploadPurchaseReturnAttachment({
          originalName: 'x.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.alloc(0),
        }),
    ).toThrow('UPLOAD_PURCHASE_RETURN_ATTACHMENT.FILE_REQUIRED');
  });

  it('should reject a disallowed MIME type', () => {
    expect(
      () =>
        new UploadPurchaseReturnAttachment({
          originalName: 'evil.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ'),
        }),
    ).toThrow('UPLOAD_PURCHASE_RETURN_ATTACHMENT.MIME_NOT_ALLOWED');
  });

  it('should reject when the extension is inconsistent with the MIME type', () => {
    expect(
      () =>
        new UploadPurchaseReturnAttachment({
          originalName: 'sneaky.exe',
          mimeType: 'application/pdf',
          buffer: Buffer.from('data'),
        }),
    ).toThrow('UPLOAD_PURCHASE_RETURN_ATTACHMENT.MIME_NOT_ALLOWED');
  });

  it('should reject a file larger than 5 MB', () => {
    expect(
      () =>
        new UploadPurchaseReturnAttachment({
          originalName: 'big.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES + 1),
        }),
    ).toThrow('UPLOAD_PURCHASE_RETURN_ATTACHMENT.FILE_TOO_LARGE');
  });

  it('should accept a jpeg with .jpg extension', () => {
    const vo = new UploadPurchaseReturnAttachment({
      originalName: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('jpegdata'),
    });
    expect(vo.mimeType).toBe('image/jpeg');
  });
});

describe('UploadPurchaseReturnAttachmentUseCase', () => {
  it('should validate, verify tenant scope, store the file, then persist metadata', async () => {
    prRepo.getById.mockResolvedValue({ id: 'pr1', returnNumber: 'RTN-2026-000001' } as never);
    storage.save.mockResolvedValue({ storedPath: 'uploads/purchase-returns/2026/x.pdf' });
    prRepo.addAttachment.mockResolvedValue({
      id: 'att-1',
      originalName: 'return-note.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.buffer.length,
      uploadedBy: 'u1',
      uploadedByName: 'Budi',
      createdAt: new Date(),
    });

    const useCase = new UploadPurchaseReturnAttachmentUseCase(prRepo, storage);
    const result = await useCase.execute('pr1', pdf, 'c1', 'u1');

    expect(prRepo.getById).toHaveBeenCalledWith('pr1', 'c1');
    expect(storage.save).toHaveBeenCalledWith(
      'RTN-2026-000001',
      'return-note.pdf',
      'application/pdf',
      pdf.buffer,
    );
    expect(prRepo.addAttachment).toHaveBeenCalledWith('pr1', 'c1', 'u1', {
      originalName: 'return-note.pdf',
      storedPath: 'uploads/purchase-returns/2026/x.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.buffer.length,
    });
    expect(result.id).toBe('att-1');
  });

  it('should reject an invalid file before any IO', async () => {
    const useCase = new UploadPurchaseReturnAttachmentUseCase(prRepo, storage);
    await expect(
      useCase.execute(
        'pr1',
        { originalName: 'x.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('UPLOAD_PURCHASE_RETURN_ATTACHMENT.MIME_NOT_ALLOWED');
    expect(prRepo.getById).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('should propagate PURCHASE_RETURN.NOT_FOUND for a foreign return (no file written)', async () => {
    prRepo.getById.mockRejectedValue(new Error('PURCHASE_RETURN.NOT_FOUND'));
    const useCase = new UploadPurchaseReturnAttachmentUseCase(prRepo, storage);
    await expect(useCase.execute('pr1', pdf, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_RETURN.NOT_FOUND',
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('should remove the orphan file when the DB write fails', async () => {
    prRepo.getById.mockResolvedValue({ id: 'pr1', returnNumber: 'RTN-1' } as never);
    storage.save.mockResolvedValue({ storedPath: 'uploads/purchase-returns/2026/x.pdf' });
    prRepo.addAttachment.mockRejectedValue(new Error('DB down'));
    storage.remove.mockResolvedValue(undefined);

    const useCase = new UploadPurchaseReturnAttachmentUseCase(prRepo, storage);
    await expect(useCase.execute('pr1', pdf, 'c1', 'u1')).rejects.toThrow('DB down');
    expect(storage.remove).toHaveBeenCalledWith('uploads/purchase-returns/2026/x.pdf');
  });
});

describe('ListPurchaseReturnAttachmentsUseCase', () => {
  it('should verify tenant scope then list', async () => {
    prRepo.ensureExists.mockResolvedValue(undefined);
    prRepo.listAttachments.mockResolvedValue([]);

    await new ListPurchaseReturnAttachmentsUseCase(prRepo).execute('pr1', 'c1');

    expect(prRepo.ensureExists).toHaveBeenCalledWith('pr1', 'c1');
    expect(prRepo.listAttachments).toHaveBeenCalledWith('pr1', 'c1');
  });

  it('should propagate PURCHASE_RETURN.NOT_FOUND for a foreign return', async () => {
    prRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_RETURN.NOT_FOUND'));
    await expect(
      new ListPurchaseReturnAttachmentsUseCase(prRepo).execute('pr1', 'c1'),
    ).rejects.toThrow('PURCHASE_RETURN.NOT_FOUND');
    expect(prRepo.listAttachments).not.toHaveBeenCalled();
  });
});

describe('GetPurchaseReturnAttachmentUseCase', () => {
  it('should resolve metadata (return + company scoped) and open a stream', async () => {
    const meta = {
      id: 'att-1',
      originalName: 'return-note.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'u1',
      uploadedByName: 'Budi',
      createdAt: new Date(),
      storedPath: 'uploads/purchase-returns/2026/x.pdf',
    };
    prRepo.getAttachmentById.mockResolvedValue(meta);
    const fakeStream = { pipe: jest.fn() } as unknown as NodeJS.ReadableStream;
    storage.createReadStream.mockReturnValue(fakeStream);

    const result = await new GetPurchaseReturnAttachmentUseCase(prRepo, storage).execute(
      'pr1',
      'att-1',
      'c1',
    );

    expect(prRepo.getAttachmentById).toHaveBeenCalledWith('pr1', 'att-1', 'c1');
    expect(storage.createReadStream).toHaveBeenCalledWith('uploads/purchase-returns/2026/x.pdf');
    expect(result.attachment).toBe(meta);
    expect(result.stream).toBe(fakeStream);
  });

  it('should propagate NOT_FOUND for a foreign attachment (IDOR guard)', async () => {
    prRepo.getAttachmentById.mockRejectedValue(
      new Error('PURCHASE_RETURN_ATTACHMENT.NOT_FOUND'),
    );
    await expect(
      new GetPurchaseReturnAttachmentUseCase(prRepo, storage).execute('pr1', 'att-1', 'c1'),
    ).rejects.toThrow('PURCHASE_RETURN_ATTACHMENT.NOT_FOUND');
    expect(storage.createReadStream).not.toHaveBeenCalled();
  });
});

describe('DeletePurchaseReturnAttachmentUseCase', () => {
  it('should delete the row (return + company scoped) then remove the physical file', async () => {
    prRepo.deleteAttachment.mockResolvedValue({
      id: 'att-1',
      originalName: 'return-note.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'u1',
      uploadedByName: null,
      createdAt: new Date(),
      storedPath: 'uploads/purchase-returns/2026/x.pdf',
    });
    storage.remove.mockResolvedValue(undefined);

    await new DeletePurchaseReturnAttachmentUseCase(prRepo, storage).execute('pr1', 'att-1', 'c1');

    expect(prRepo.deleteAttachment).toHaveBeenCalledWith('pr1', 'att-1', 'c1');
    expect(storage.remove).toHaveBeenCalledWith('uploads/purchase-returns/2026/x.pdf');
  });

  it('should propagate NOT_FOUND without touching storage', async () => {
    prRepo.deleteAttachment.mockRejectedValue(
      new Error('PURCHASE_RETURN_ATTACHMENT.NOT_FOUND'),
    );
    await expect(
      new DeletePurchaseReturnAttachmentUseCase(prRepo, storage).execute('pr1', 'att-1', 'c1'),
    ).rejects.toThrow('PURCHASE_RETURN_ATTACHMENT.NOT_FOUND');
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
