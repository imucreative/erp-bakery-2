import { UploadGoodsReceiptAttachmentUseCase } from '../UploadGoodsReceiptAttachmentUseCase';
import { ListGoodsReceiptAttachmentsUseCase } from '../ListGoodsReceiptAttachmentsUseCase';
import { GetGoodsReceiptAttachmentUseCase } from '../GetGoodsReceiptAttachmentUseCase';
import { DeleteGoodsReceiptAttachmentUseCase } from '../DeleteGoodsReceiptAttachmentUseCase';
import { UploadGoodsReceiptAttachment } from '../../../../Domains/goods-receipts/entities/UploadGoodsReceiptAttachment';
import { GoodsReceiptRepository } from '../../../../Domains/goods-receipts/GoodsReceiptRepository';
import { GoodsReceiptAttachmentStorage } from '../../../../Domains/goods-receipts/GoodsReceiptAttachmentStorage';
import { MAX_ATTACHMENT_SIZE_BYTES } from '../../../../Domains/goods-receipts/goodsReceiptAttachmentPolicy';

const grRepo: jest.Mocked<GoodsReceiptRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  getConsumedQtyByPoItem: jest.fn(),
  cancel: jest.fn(),
  complete: jest.fn(),
  ensureExists: jest.fn(),
  addComment: jest.fn(),
  listComments: jest.fn(),
  addAttachment: jest.fn(),
  listAttachments: jest.fn(),
  getAttachmentById: jest.fn(),
  deleteAttachment: jest.fn(),
} as unknown as jest.Mocked<GoodsReceiptRepository>;

const storage: jest.Mocked<GoodsReceiptAttachmentStorage> = {
  save: jest.fn(),
  remove: jest.fn(),
  resolveAbsolutePath: jest.fn(),
  createReadStream: jest.fn(),
} as unknown as jest.Mocked<GoodsReceiptAttachmentStorage>;

beforeEach(() => jest.clearAllMocks());

const pdf = { originalName: 'delivery-note.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 data') };

describe('UploadGoodsReceiptAttachment (domain validation)', () => {
  it('should accept a valid PDF and expose trimmed metadata', () => {
    const vo = new UploadGoodsReceiptAttachment({
      originalName: '  delivery-note.pdf  ',
      mimeType: 'application/pdf',
      buffer: Buffer.from('data'),
    });
    expect(vo.originalName).toBe('delivery-note.pdf');
    expect(vo.mimeType).toBe('application/pdf');
    expect(vo.sizeBytes).toBe(4);
  });

  it('should reject a missing/empty file', () => {
    expect(
      () =>
        new UploadGoodsReceiptAttachment({
          originalName: 'x.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.alloc(0),
        }),
    ).toThrow('UPLOAD_GOODS_RECEIPT_ATTACHMENT.FILE_REQUIRED');
  });

  it('should reject a disallowed MIME type', () => {
    expect(
      () =>
        new UploadGoodsReceiptAttachment({
          originalName: 'evil.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ'),
        }),
    ).toThrow('UPLOAD_GOODS_RECEIPT_ATTACHMENT.MIME_NOT_ALLOWED');
  });

  it('should reject when the extension is inconsistent with the MIME type', () => {
    expect(
      () =>
        new UploadGoodsReceiptAttachment({
          originalName: 'sneaky.exe',
          mimeType: 'application/pdf',
          buffer: Buffer.from('data'),
        }),
    ).toThrow('UPLOAD_GOODS_RECEIPT_ATTACHMENT.MIME_NOT_ALLOWED');
  });

  it('should reject a file larger than 5 MB', () => {
    expect(
      () =>
        new UploadGoodsReceiptAttachment({
          originalName: 'big.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES + 1),
        }),
    ).toThrow('UPLOAD_GOODS_RECEIPT_ATTACHMENT.FILE_TOO_LARGE');
  });

  it('should accept a jpeg with .jpg extension', () => {
    const vo = new UploadGoodsReceiptAttachment({
      originalName: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('jpegdata'),
    });
    expect(vo.mimeType).toBe('image/jpeg');
  });
});

describe('UploadGoodsReceiptAttachmentUseCase', () => {
  it('should validate, verify tenant scope, store the file, then persist metadata', async () => {
    grRepo.getById.mockResolvedValue({ id: 'gr1', grNumber: 'GR-2026-000001' } as never);
    storage.save.mockResolvedValue({ storedPath: 'uploads/goods-receipt/2026/x.pdf' });
    grRepo.addAttachment.mockResolvedValue({
      id: 'att-1',
      originalName: 'delivery-note.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.buffer.length,
      uploadedBy: 'u1',
      uploadedByName: 'Budi',
      createdAt: new Date(),
    });

    const useCase = new UploadGoodsReceiptAttachmentUseCase(grRepo, storage);
    const result = await useCase.execute('gr1', pdf, 'c1', 'u1');

    expect(grRepo.getById).toHaveBeenCalledWith('gr1', 'c1');
    expect(storage.save).toHaveBeenCalledWith(
      'GR-2026-000001',
      'delivery-note.pdf',
      'application/pdf',
      pdf.buffer,
    );
    expect(grRepo.addAttachment).toHaveBeenCalledWith('gr1', 'c1', 'u1', {
      originalName: 'delivery-note.pdf',
      storedPath: 'uploads/goods-receipt/2026/x.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.buffer.length,
    });
    expect(result.id).toBe('att-1');
  });

  it('should reject an invalid file before any IO', async () => {
    const useCase = new UploadGoodsReceiptAttachmentUseCase(grRepo, storage);
    await expect(
      useCase.execute(
        'gr1',
        { originalName: 'x.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('UPLOAD_GOODS_RECEIPT_ATTACHMENT.MIME_NOT_ALLOWED');
    expect(grRepo.getById).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('should propagate GOODS_RECEIPT.NOT_FOUND for a foreign GR (no file written)', async () => {
    grRepo.getById.mockRejectedValue(new Error('GOODS_RECEIPT.NOT_FOUND'));
    const useCase = new UploadGoodsReceiptAttachmentUseCase(grRepo, storage);
    await expect(useCase.execute('gr1', pdf, 'c1', 'u1')).rejects.toThrow(
      'GOODS_RECEIPT.NOT_FOUND',
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('should remove the orphan file when the DB write fails', async () => {
    grRepo.getById.mockResolvedValue({ id: 'gr1', grNumber: 'GR-1' } as never);
    storage.save.mockResolvedValue({ storedPath: 'uploads/goods-receipt/2026/x.pdf' });
    grRepo.addAttachment.mockRejectedValue(new Error('DB down'));
    storage.remove.mockResolvedValue(undefined);

    const useCase = new UploadGoodsReceiptAttachmentUseCase(grRepo, storage);
    await expect(useCase.execute('gr1', pdf, 'c1', 'u1')).rejects.toThrow('DB down');
    expect(storage.remove).toHaveBeenCalledWith('uploads/goods-receipt/2026/x.pdf');
  });
});

describe('ListGoodsReceiptAttachmentsUseCase', () => {
  it('should verify tenant scope then list', async () => {
    grRepo.ensureExists.mockResolvedValue(undefined);
    grRepo.listAttachments.mockResolvedValue([]);

    await new ListGoodsReceiptAttachmentsUseCase(grRepo).execute('gr1', 'c1');

    expect(grRepo.ensureExists).toHaveBeenCalledWith('gr1', 'c1');
    expect(grRepo.listAttachments).toHaveBeenCalledWith('gr1', 'c1');
  });

  it('should propagate GOODS_RECEIPT.NOT_FOUND for a foreign GR', async () => {
    grRepo.ensureExists.mockRejectedValue(new Error('GOODS_RECEIPT.NOT_FOUND'));
    await expect(
      new ListGoodsReceiptAttachmentsUseCase(grRepo).execute('gr1', 'c1'),
    ).rejects.toThrow('GOODS_RECEIPT.NOT_FOUND');
    expect(grRepo.listAttachments).not.toHaveBeenCalled();
  });
});

describe('GetGoodsReceiptAttachmentUseCase', () => {
  it('should resolve metadata (GR + company scoped) and open a stream', async () => {
    const meta = {
      id: 'att-1',
      originalName: 'delivery-note.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'u1',
      uploadedByName: 'Budi',
      createdAt: new Date(),
      storedPath: 'uploads/goods-receipt/2026/x.pdf',
    };
    grRepo.getAttachmentById.mockResolvedValue(meta);
    const fakeStream = { pipe: jest.fn() } as unknown as NodeJS.ReadableStream;
    storage.createReadStream.mockReturnValue(fakeStream);

    const result = await new GetGoodsReceiptAttachmentUseCase(grRepo, storage).execute(
      'gr1',
      'att-1',
      'c1',
    );

    expect(grRepo.getAttachmentById).toHaveBeenCalledWith('gr1', 'att-1', 'c1');
    expect(storage.createReadStream).toHaveBeenCalledWith('uploads/goods-receipt/2026/x.pdf');
    expect(result.attachment).toBe(meta);
    expect(result.stream).toBe(fakeStream);
  });

  it('should propagate NOT_FOUND for a foreign attachment (IDOR guard)', async () => {
    grRepo.getAttachmentById.mockRejectedValue(
      new Error('GOODS_RECEIPT_ATTACHMENT.NOT_FOUND'),
    );
    await expect(
      new GetGoodsReceiptAttachmentUseCase(grRepo, storage).execute('gr1', 'att-1', 'c1'),
    ).rejects.toThrow('GOODS_RECEIPT_ATTACHMENT.NOT_FOUND');
    expect(storage.createReadStream).not.toHaveBeenCalled();
  });
});

describe('DeleteGoodsReceiptAttachmentUseCase', () => {
  it('should delete the row (GR + company scoped) then remove the physical file', async () => {
    grRepo.deleteAttachment.mockResolvedValue({
      id: 'att-1',
      originalName: 'delivery-note.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'u1',
      uploadedByName: null,
      createdAt: new Date(),
      storedPath: 'uploads/goods-receipt/2026/x.pdf',
    });
    storage.remove.mockResolvedValue(undefined);

    await new DeleteGoodsReceiptAttachmentUseCase(grRepo, storage).execute('gr1', 'att-1', 'c1');

    expect(grRepo.deleteAttachment).toHaveBeenCalledWith('gr1', 'att-1', 'c1');
    expect(storage.remove).toHaveBeenCalledWith('uploads/goods-receipt/2026/x.pdf');
  });

  it('should propagate NOT_FOUND without touching storage', async () => {
    grRepo.deleteAttachment.mockRejectedValue(
      new Error('GOODS_RECEIPT_ATTACHMENT.NOT_FOUND'),
    );
    await expect(
      new DeleteGoodsReceiptAttachmentUseCase(grRepo, storage).execute('gr1', 'att-1', 'c1'),
    ).rejects.toThrow('GOODS_RECEIPT_ATTACHMENT.NOT_FOUND');
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
