import { UploadPurchaseRequestAttachmentUseCase } from '../UploadPurchaseRequestAttachmentUseCase';
import { ListPurchaseRequestAttachmentsUseCase } from '../ListPurchaseRequestAttachmentsUseCase';
import { GetPurchaseRequestAttachmentUseCase } from '../GetPurchaseRequestAttachmentUseCase';
import { DeletePurchaseRequestAttachmentUseCase } from '../DeletePurchaseRequestAttachmentUseCase';
import { UploadPurchaseRequestAttachment } from '../../../../Domains/purchase-requests/entities/UploadPurchaseRequestAttachment';
import { PurchaseRequestRepository } from '../../../../Domains/purchase-requests/PurchaseRequestRepository';
import { PurchaseRequestAttachmentStorage } from '../../../../Domains/purchase-requests/PurchaseRequestAttachmentStorage';
import { MAX_ATTACHMENT_SIZE_BYTES } from '../../../../Domains/purchase-requests/purchaseRequestAttachmentPolicy';

const prRepo: jest.Mocked<PurchaseRequestRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  submit: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  cancel: jest.fn(),
  ensureExists: jest.fn(),
  addComment: jest.fn(),
  listComments: jest.fn(),
  addAttachment: jest.fn(),
  listAttachments: jest.fn(),
  getAttachmentById: jest.fn(),
  deleteAttachment: jest.fn(),
} as unknown as jest.Mocked<PurchaseRequestRepository>;

const storage: jest.Mocked<PurchaseRequestAttachmentStorage> = {
  save: jest.fn(),
  remove: jest.fn(),
  resolveAbsolutePath: jest.fn(),
  createReadStream: jest.fn(),
} as unknown as jest.Mocked<PurchaseRequestAttachmentStorage>;

beforeEach(() => jest.clearAllMocks());

const pdf = { originalName: 'quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 data') };

describe('UploadPurchaseRequestAttachment (domain validation)', () => {
  it('should accept a valid PDF and expose trimmed metadata', () => {
    const vo = new UploadPurchaseRequestAttachment({
      originalName: '  quote.pdf  ',
      mimeType: 'application/pdf',
      buffer: Buffer.from('data'),
    });
    expect(vo.originalName).toBe('quote.pdf');
    expect(vo.mimeType).toBe('application/pdf');
    expect(vo.sizeBytes).toBe(4);
  });

  it('should reject a missing/empty file', () => {
    expect(
      () =>
        new UploadPurchaseRequestAttachment({
          originalName: 'x.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.alloc(0),
        }),
    ).toThrow('UPLOAD_PURCHASE_REQUEST_ATTACHMENT.FILE_REQUIRED');
  });

  it('should reject a disallowed MIME type', () => {
    expect(
      () =>
        new UploadPurchaseRequestAttachment({
          originalName: 'evil.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ'),
        }),
    ).toThrow('UPLOAD_PURCHASE_REQUEST_ATTACHMENT.MIME_NOT_ALLOWED');
  });

  it('should reject when the extension is inconsistent with the MIME type', () => {
    expect(
      () =>
        new UploadPurchaseRequestAttachment({
          originalName: 'sneaky.exe',
          mimeType: 'application/pdf',
          buffer: Buffer.from('data'),
        }),
    ).toThrow('UPLOAD_PURCHASE_REQUEST_ATTACHMENT.MIME_NOT_ALLOWED');
  });

  it('should reject a file larger than 5 MB', () => {
    expect(
      () =>
        new UploadPurchaseRequestAttachment({
          originalName: 'big.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES + 1),
        }),
    ).toThrow('UPLOAD_PURCHASE_REQUEST_ATTACHMENT.FILE_TOO_LARGE');
  });

  it('should accept a jpeg with .jpg extension', () => {
    const vo = new UploadPurchaseRequestAttachment({
      originalName: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('jpegdata'),
    });
    expect(vo.mimeType).toBe('image/jpeg');
  });
});

describe('UploadPurchaseRequestAttachmentUseCase', () => {
  it('should validate, verify tenant scope, store the file, then persist metadata', async () => {
    prRepo.getById.mockResolvedValue({ id: 'pr1', prNumber: 'PR-OUT001-2026-000001' } as never);
    storage.save.mockResolvedValue({ storedPath: 'uploads/purchase-request/2026/x.pdf' });
    prRepo.addAttachment.mockResolvedValue({
      id: 'att-1',
      originalName: 'quote.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.buffer.length,
      uploadedBy: 'u1',
      uploadedByName: 'Budi',
      createdAt: new Date(),
    });

    const useCase = new UploadPurchaseRequestAttachmentUseCase(prRepo, storage);
    const result = await useCase.execute('pr1', pdf, 'c1', 'u1');

    expect(prRepo.getById).toHaveBeenCalledWith('pr1', 'c1');
    expect(storage.save).toHaveBeenCalledWith(
      'PR-OUT001-2026-000001',
      'quote.pdf',
      'application/pdf',
      pdf.buffer,
    );
    expect(prRepo.addAttachment).toHaveBeenCalledWith('pr1', 'c1', 'u1', {
      originalName: 'quote.pdf',
      storedPath: 'uploads/purchase-request/2026/x.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.buffer.length,
    });
    expect(result.id).toBe('att-1');
  });

  it('should reject an invalid file before any IO', async () => {
    const useCase = new UploadPurchaseRequestAttachmentUseCase(prRepo, storage);
    await expect(
      useCase.execute(
        'pr1',
        { originalName: 'x.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('UPLOAD_PURCHASE_REQUEST_ATTACHMENT.MIME_NOT_ALLOWED');
    expect(prRepo.getById).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('should propagate PURCHASE_REQUEST.NOT_FOUND for a foreign PR (no file written)', async () => {
    prRepo.getById.mockRejectedValue(new Error('PURCHASE_REQUEST.NOT_FOUND'));
    const useCase = new UploadPurchaseRequestAttachmentUseCase(prRepo, storage);
    await expect(useCase.execute('pr1', pdf, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_REQUEST.NOT_FOUND',
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('should remove the orphan file when the DB write fails', async () => {
    prRepo.getById.mockResolvedValue({ id: 'pr1', prNumber: 'PR-1' } as never);
    storage.save.mockResolvedValue({ storedPath: 'uploads/purchase-request/2026/x.pdf' });
    prRepo.addAttachment.mockRejectedValue(new Error('DB down'));
    storage.remove.mockResolvedValue(undefined);

    const useCase = new UploadPurchaseRequestAttachmentUseCase(prRepo, storage);
    await expect(useCase.execute('pr1', pdf, 'c1', 'u1')).rejects.toThrow('DB down');
    expect(storage.remove).toHaveBeenCalledWith('uploads/purchase-request/2026/x.pdf');
  });
});

describe('ListPurchaseRequestAttachmentsUseCase', () => {
  it('should verify tenant scope then list', async () => {
    prRepo.ensureExists.mockResolvedValue(undefined);
    prRepo.listAttachments.mockResolvedValue([]);

    await new ListPurchaseRequestAttachmentsUseCase(prRepo).execute('pr1', 'c1');

    expect(prRepo.ensureExists).toHaveBeenCalledWith('pr1', 'c1');
    expect(prRepo.listAttachments).toHaveBeenCalledWith('pr1', 'c1');
  });

  it('should propagate PURCHASE_REQUEST.NOT_FOUND for a foreign PR', async () => {
    prRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_REQUEST.NOT_FOUND'));
    await expect(
      new ListPurchaseRequestAttachmentsUseCase(prRepo).execute('pr1', 'c1'),
    ).rejects.toThrow('PURCHASE_REQUEST.NOT_FOUND');
    expect(prRepo.listAttachments).not.toHaveBeenCalled();
  });
});

describe('GetPurchaseRequestAttachmentUseCase', () => {
  it('should resolve metadata (PR + company scoped) and open a stream', async () => {
    const meta = {
      id: 'att-1',
      originalName: 'quote.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'u1',
      uploadedByName: 'Budi',
      createdAt: new Date(),
      storedPath: 'uploads/purchase-request/2026/x.pdf',
    };
    prRepo.getAttachmentById.mockResolvedValue(meta);
    const fakeStream = { pipe: jest.fn() } as unknown as NodeJS.ReadableStream;
    storage.createReadStream.mockReturnValue(fakeStream);

    const result = await new GetPurchaseRequestAttachmentUseCase(prRepo, storage).execute(
      'pr1',
      'att-1',
      'c1',
    );

    expect(prRepo.getAttachmentById).toHaveBeenCalledWith('pr1', 'att-1', 'c1');
    expect(storage.createReadStream).toHaveBeenCalledWith('uploads/purchase-request/2026/x.pdf');
    expect(result.attachment).toBe(meta);
    expect(result.stream).toBe(fakeStream);
  });

  it('should propagate NOT_FOUND for a foreign attachment (IDOR guard)', async () => {
    prRepo.getAttachmentById.mockRejectedValue(
      new Error('PURCHASE_REQUEST_ATTACHMENT.NOT_FOUND'),
    );
    await expect(
      new GetPurchaseRequestAttachmentUseCase(prRepo, storage).execute('pr1', 'att-1', 'c1'),
    ).rejects.toThrow('PURCHASE_REQUEST_ATTACHMENT.NOT_FOUND');
    expect(storage.createReadStream).not.toHaveBeenCalled();
  });
});

describe('DeletePurchaseRequestAttachmentUseCase', () => {
  it('should delete the row (PR + company scoped) then remove the physical file', async () => {
    prRepo.deleteAttachment.mockResolvedValue({
      id: 'att-1',
      originalName: 'quote.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'u1',
      uploadedByName: null,
      createdAt: new Date(),
      storedPath: 'uploads/purchase-request/2026/x.pdf',
    });
    storage.remove.mockResolvedValue(undefined);

    await new DeletePurchaseRequestAttachmentUseCase(prRepo, storage).execute('pr1', 'att-1', 'c1');

    expect(prRepo.deleteAttachment).toHaveBeenCalledWith('pr1', 'att-1', 'c1');
    expect(storage.remove).toHaveBeenCalledWith('uploads/purchase-request/2026/x.pdf');
  });

  it('should propagate NOT_FOUND without touching storage', async () => {
    prRepo.deleteAttachment.mockRejectedValue(
      new Error('PURCHASE_REQUEST_ATTACHMENT.NOT_FOUND'),
    );
    await expect(
      new DeletePurchaseRequestAttachmentUseCase(prRepo, storage).execute('pr1', 'att-1', 'c1'),
    ).rejects.toThrow('PURCHASE_REQUEST_ATTACHMENT.NOT_FOUND');
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
