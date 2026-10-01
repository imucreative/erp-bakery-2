import { UploadPurchaseOrderAttachmentUseCase } from '../UploadPurchaseOrderAttachmentUseCase';
import { ListPurchaseOrderAttachmentsUseCase } from '../ListPurchaseOrderAttachmentsUseCase';
import { GetPurchaseOrderAttachmentUseCase } from '../GetPurchaseOrderAttachmentUseCase';
import { DeletePurchaseOrderAttachmentUseCase } from '../DeletePurchaseOrderAttachmentUseCase';
import { UploadPurchaseOrderAttachment } from '../../../../Domains/purchase-orders/entities/UploadPurchaseOrderAttachment';
import { PurchaseOrderRepository } from '../../../../Domains/purchase-orders/PurchaseOrderRepository';
import { PurchaseOrderAttachmentStorage } from '../../../../Domains/purchase-orders/PurchaseOrderAttachmentStorage';
import { MAX_ATTACHMENT_SIZE_BYTES } from '../../../../Domains/purchase-orders/purchaseOrderAttachmentPolicy';

const poRepo: jest.Mocked<PurchaseOrderRepository> = {
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
} as unknown as jest.Mocked<PurchaseOrderRepository>;

const storage: jest.Mocked<PurchaseOrderAttachmentStorage> = {
  save: jest.fn(),
  remove: jest.fn(),
  resolveAbsolutePath: jest.fn(),
  createReadStream: jest.fn(),
} as unknown as jest.Mocked<PurchaseOrderAttachmentStorage>;

beforeEach(() => jest.clearAllMocks());

const pdf = { originalName: 'quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 data') };

describe('UploadPurchaseOrderAttachment (domain validation)', () => {
  it('should accept a valid PDF and expose trimmed metadata', () => {
    const vo = new UploadPurchaseOrderAttachment({
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
        new UploadPurchaseOrderAttachment({
          originalName: 'x.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.alloc(0),
        }),
    ).toThrow('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_REQUIRED');
  });

  it('should reject a disallowed MIME type', () => {
    expect(
      () =>
        new UploadPurchaseOrderAttachment({
          originalName: 'evil.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ'),
        }),
    ).toThrow('UPLOAD_PURCHASE_ORDER_ATTACHMENT.MIME_NOT_ALLOWED');
  });

  it('should reject when the extension is inconsistent with the MIME type', () => {
    expect(
      () =>
        new UploadPurchaseOrderAttachment({
          originalName: 'sneaky.exe',
          mimeType: 'application/pdf',
          buffer: Buffer.from('data'),
        }),
    ).toThrow('UPLOAD_PURCHASE_ORDER_ATTACHMENT.MIME_NOT_ALLOWED');
  });

  it('should reject a file larger than 5 MB', () => {
    expect(
      () =>
        new UploadPurchaseOrderAttachment({
          originalName: 'big.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES + 1),
        }),
    ).toThrow('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_TOO_LARGE');
  });

  it('should accept a jpeg with .jpg extension', () => {
    const vo = new UploadPurchaseOrderAttachment({
      originalName: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('jpegdata'),
    });
    expect(vo.mimeType).toBe('image/jpeg');
  });
});

describe('UploadPurchaseOrderAttachmentUseCase', () => {
  it('should validate, verify tenant scope, store the file, then persist metadata', async () => {
    poRepo.getById.mockResolvedValue({ id: 'po1', poNumber: 'PO-OUT001-2026-000001' } as never);
    storage.save.mockResolvedValue({ storedPath: 'uploads/purchase-order/2026/x.pdf' });
    poRepo.addAttachment.mockResolvedValue({
      id: 'att-1',
      originalName: 'quote.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.buffer.length,
      uploadedBy: 'u1',
      uploadedByName: 'Budi',
      createdAt: new Date(),
    });

    const useCase = new UploadPurchaseOrderAttachmentUseCase(poRepo, storage);
    const result = await useCase.execute('po1', pdf, 'c1', 'u1');

    expect(poRepo.getById).toHaveBeenCalledWith('po1', 'c1');
    expect(storage.save).toHaveBeenCalledWith(
      'PO-OUT001-2026-000001',
      'quote.pdf',
      'application/pdf',
      pdf.buffer,
    );
    expect(poRepo.addAttachment).toHaveBeenCalledWith('po1', 'c1', 'u1', {
      originalName: 'quote.pdf',
      storedPath: 'uploads/purchase-order/2026/x.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.buffer.length,
    });
    expect(result.id).toBe('att-1');
  });

  it('should reject an invalid file before any IO', async () => {
    const useCase = new UploadPurchaseOrderAttachmentUseCase(poRepo, storage);
    await expect(
      useCase.execute(
        'po1',
        { originalName: 'x.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('UPLOAD_PURCHASE_ORDER_ATTACHMENT.MIME_NOT_ALLOWED');
    expect(poRepo.getById).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('should propagate PURCHASE_ORDER.NOT_FOUND for a foreign PO (no file written)', async () => {
    poRepo.getById.mockRejectedValue(new Error('PURCHASE_ORDER.NOT_FOUND'));
    const useCase = new UploadPurchaseOrderAttachmentUseCase(poRepo, storage);
    await expect(useCase.execute('po1', pdf, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.NOT_FOUND',
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('should remove the orphan file when the DB write fails', async () => {
    poRepo.getById.mockResolvedValue({ id: 'po1', poNumber: 'PO-1' } as never);
    storage.save.mockResolvedValue({ storedPath: 'uploads/purchase-order/2026/x.pdf' });
    poRepo.addAttachment.mockRejectedValue(new Error('DB down'));
    storage.remove.mockResolvedValue(undefined);

    const useCase = new UploadPurchaseOrderAttachmentUseCase(poRepo, storage);
    await expect(useCase.execute('po1', pdf, 'c1', 'u1')).rejects.toThrow('DB down');
    expect(storage.remove).toHaveBeenCalledWith('uploads/purchase-order/2026/x.pdf');
  });
});

describe('ListPurchaseOrderAttachmentsUseCase', () => {
  it('should verify tenant scope then list', async () => {
    poRepo.ensureExists.mockResolvedValue(undefined);
    poRepo.listAttachments.mockResolvedValue([]);

    await new ListPurchaseOrderAttachmentsUseCase(poRepo).execute('po1', 'c1');

    expect(poRepo.ensureExists).toHaveBeenCalledWith('po1', 'c1');
    expect(poRepo.listAttachments).toHaveBeenCalledWith('po1', 'c1');
  });

  it('should propagate PURCHASE_ORDER.NOT_FOUND for a foreign PO', async () => {
    poRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_ORDER.NOT_FOUND'));
    await expect(
      new ListPurchaseOrderAttachmentsUseCase(poRepo).execute('po1', 'c1'),
    ).rejects.toThrow('PURCHASE_ORDER.NOT_FOUND');
    expect(poRepo.listAttachments).not.toHaveBeenCalled();
  });
});

describe('GetPurchaseOrderAttachmentUseCase', () => {
  it('should resolve metadata (PO + company scoped) and open a stream', async () => {
    const meta = {
      id: 'att-1',
      originalName: 'quote.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'u1',
      uploadedByName: 'Budi',
      createdAt: new Date(),
      storedPath: 'uploads/purchase-order/2026/x.pdf',
    };
    poRepo.getAttachmentById.mockResolvedValue(meta);
    const fakeStream = { pipe: jest.fn() } as unknown as NodeJS.ReadableStream;
    storage.createReadStream.mockReturnValue(fakeStream);

    const result = await new GetPurchaseOrderAttachmentUseCase(poRepo, storage).execute(
      'po1',
      'att-1',
      'c1',
    );

    expect(poRepo.getAttachmentById).toHaveBeenCalledWith('po1', 'att-1', 'c1');
    expect(storage.createReadStream).toHaveBeenCalledWith('uploads/purchase-order/2026/x.pdf');
    expect(result.attachment).toBe(meta);
    expect(result.stream).toBe(fakeStream);
  });

  it('should propagate NOT_FOUND for a foreign attachment (IDOR guard)', async () => {
    poRepo.getAttachmentById.mockRejectedValue(
      new Error('PURCHASE_ORDER_ATTACHMENT.NOT_FOUND'),
    );
    await expect(
      new GetPurchaseOrderAttachmentUseCase(poRepo, storage).execute('po1', 'att-1', 'c1'),
    ).rejects.toThrow('PURCHASE_ORDER_ATTACHMENT.NOT_FOUND');
    expect(storage.createReadStream).not.toHaveBeenCalled();
  });
});

describe('DeletePurchaseOrderAttachmentUseCase', () => {
  it('should delete the row (PO + company scoped) then remove the physical file', async () => {
    poRepo.deleteAttachment.mockResolvedValue({
      id: 'att-1',
      originalName: 'quote.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'u1',
      uploadedByName: null,
      createdAt: new Date(),
      storedPath: 'uploads/purchase-order/2026/x.pdf',
    });
    storage.remove.mockResolvedValue(undefined);

    await new DeletePurchaseOrderAttachmentUseCase(poRepo, storage).execute('po1', 'att-1', 'c1');

    expect(poRepo.deleteAttachment).toHaveBeenCalledWith('po1', 'att-1', 'c1');
    expect(storage.remove).toHaveBeenCalledWith('uploads/purchase-order/2026/x.pdf');
  });

  it('should propagate NOT_FOUND without touching storage', async () => {
    poRepo.deleteAttachment.mockRejectedValue(
      new Error('PURCHASE_ORDER_ATTACHMENT.NOT_FOUND'),
    );
    await expect(
      new DeletePurchaseOrderAttachmentUseCase(poRepo, storage).execute('po1', 'att-1', 'c1'),
    ).rejects.toThrow('PURCHASE_ORDER_ATTACHMENT.NOT_FOUND');
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
