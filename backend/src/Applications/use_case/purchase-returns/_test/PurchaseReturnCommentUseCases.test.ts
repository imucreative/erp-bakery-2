import { AddPurchaseReturnCommentUseCase } from '../AddPurchaseReturnCommentUseCase';
import { GetPurchaseReturnCommentsUseCase } from '../GetPurchaseReturnCommentsUseCase';
import { PurchaseReturnRepository } from '../../../../Domains/purchase-returns/PurchaseReturnRepository';

/**
 * Unit tests for the Purchase Return comment use cases (Tahap 2). Mirrors the
 * Goods Receipt comment tests: body defaults to INTERNAL, SYSTEM is rejected
 * from user input, tenant scope is enforced via ensureExists before any write.
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

beforeEach(() => jest.clearAllMocks());

describe('AddPurchaseReturnCommentUseCase', () => {
  it('should default to INTERNAL, verify tenant scope, then persist and return the comment', async () => {
    prRepo.ensureExists.mockResolvedValue(undefined);
    prRepo.addComment.mockResolvedValue({
      id: 'cmt-1',
      category: 'INTERNAL',
      body: 'Please review',
      authorId: 'u1',
      authorName: 'Budi',
      createdAt: new Date(),
    });

    const useCase = new AddPurchaseReturnCommentUseCase(prRepo);
    const result = await useCase.execute('pr1', { body: 'Please review' }, 'c1', 'u1');

    expect(prRepo.ensureExists).toHaveBeenCalledWith('pr1', 'c1');
    expect(prRepo.addComment).toHaveBeenCalledWith('pr1', 'c1', 'u1', {
      category: 'INTERNAL',
      body: 'Please review',
    });
    expect(result.id).toBe('cmt-1');
  });

  it('should accept an explicit user-assignable category (APPROVAL)', async () => {
    prRepo.ensureExists.mockResolvedValue(undefined);
    prRepo.addComment.mockResolvedValue({ id: 'cmt-1' } as never);

    const useCase = new AddPurchaseReturnCommentUseCase(prRepo);
    await useCase.execute('pr1', { body: 'Approved with note', category: 'APPROVAL' }, 'c1', 'u1');

    expect(prRepo.addComment).toHaveBeenCalledWith('pr1', 'c1', 'u1', {
      category: 'APPROVAL',
      body: 'Approved with note',
    });
  });

  it('should reject an empty body before touching the repository', async () => {
    const useCase = new AddPurchaseReturnCommentUseCase(prRepo);
    await expect(useCase.execute('pr1', { body: '   ' }, 'c1', 'u1')).rejects.toThrow(
      'ADD_PURCHASE_RETURN_COMMENT.BODY_REQUIRED',
    );
    expect(prRepo.ensureExists).not.toHaveBeenCalled();
    expect(prRepo.addComment).not.toHaveBeenCalled();
  });

  it('should reject a SYSTEM category coming from user input (backend-only)', async () => {
    const useCase = new AddPurchaseReturnCommentUseCase(prRepo);
    await expect(
      useCase.execute('pr1', { body: 'hi', category: 'SYSTEM' }, 'c1', 'u1'),
    ).rejects.toThrow('ADD_PURCHASE_RETURN_COMMENT.CATEGORY_NOT_ALLOWED');
    expect(prRepo.addComment).not.toHaveBeenCalled();
  });

  it('should reject an unknown category', async () => {
    const useCase = new AddPurchaseReturnCommentUseCase(prRepo);
    await expect(
      useCase.execute('pr1', { body: 'hi', category: 'NOPE' }, 'c1', 'u1'),
    ).rejects.toThrow('ADD_PURCHASE_RETURN_COMMENT.INVALID_CATEGORY');
    expect(prRepo.addComment).not.toHaveBeenCalled();
  });

  it('should propagate PURCHASE_RETURN.NOT_FOUND when the return is in another company', async () => {
    prRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_RETURN.NOT_FOUND'));
    const useCase = new AddPurchaseReturnCommentUseCase(prRepo);
    await expect(useCase.execute('pr1', { body: 'hi' }, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_RETURN.NOT_FOUND',
    );
    expect(prRepo.addComment).not.toHaveBeenCalled();
  });
});

describe('GetPurchaseReturnCommentsUseCase', () => {
  it('should verify tenant scope then list the thread', async () => {
    prRepo.ensureExists.mockResolvedValue(undefined);
    prRepo.listComments.mockResolvedValue([]);

    const useCase = new GetPurchaseReturnCommentsUseCase(prRepo);
    await useCase.execute('pr1', 'c1');

    expect(prRepo.ensureExists).toHaveBeenCalledWith('pr1', 'c1');
    expect(prRepo.listComments).toHaveBeenCalledWith('pr1', 'c1');
  });

  it('should propagate PURCHASE_RETURN.NOT_FOUND for a foreign return', async () => {
    prRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_RETURN.NOT_FOUND'));
    const useCase = new GetPurchaseReturnCommentsUseCase(prRepo);
    await expect(useCase.execute('pr1', 'c1')).rejects.toThrow('PURCHASE_RETURN.NOT_FOUND');
    expect(prRepo.listComments).not.toHaveBeenCalled();
  });
});
