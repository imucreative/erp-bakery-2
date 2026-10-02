import { CreatePurchaseRequestUseCase } from '../CreatePurchaseRequestUseCase';
import { UpdatePurchaseRequestUseCase } from '../UpdatePurchaseRequestUseCase';
import { SubmitPurchaseRequestUseCase } from '../SubmitPurchaseRequestUseCase';
import { ApprovePurchaseRequestUseCase } from '../ApprovePurchaseRequestUseCase';
import { RejectPurchaseRequestUseCase } from '../RejectPurchaseRequestUseCase';
import { CancelPurchaseRequestUseCase } from '../CancelPurchaseRequestUseCase';
import { GetPurchaseRequestsUseCase } from '../GetPurchaseRequestsUseCase';
import { AddPurchaseRequestCommentUseCase } from '../AddPurchaseRequestCommentUseCase';
import { GetPurchaseRequestCommentsUseCase } from '../GetPurchaseRequestCommentsUseCase';
import { PurchaseRequestRepository } from '../../../../Domains/purchase-requests/PurchaseRequestRepository';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../../Domains/uoms/UomRepository';

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

const outletRepo: jest.Mocked<OutletRepository> = {
  getOutletById: jest.fn(),
} as unknown as jest.Mocked<OutletRepository>;

const productRepo: jest.Mocked<ProductRepository> = {
  getProductById: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const uomRepo: jest.Mocked<UomRepository> = {
  getUomById: jest.fn(),
} as unknown as jest.Mocked<UomRepository>;

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

const payload = {
  destinationOutletId: 'outlet-1',
  expectedDate: isoDaysFromNow(2),
  items: [
    { productId: 'prod-1', quantity: 3, uomId: 'uom-1', estimatedPrice: 5000 },
    { productId: 'prod-2', quantity: 1, uomId: 'uom-1', estimatedPrice: 1000 },
  ],
};

beforeEach(() => jest.clearAllMocks());

describe('CreatePurchaseRequestUseCase', () => {
  it('should validate references then create the draft with computed total', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'outlet-1' } as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    prRepo.createDraft.mockResolvedValue({ id: 'pr1' } as never);

    const useCase = new CreatePurchaseRequestUseCase(prRepo, outletRepo, productRepo, uomRepo);
    await useCase.execute(payload, 'c1', 'u1');

    expect(outletRepo.getOutletById).toHaveBeenCalledWith('outlet-1', 'c1');
    // unique products: prod-1, prod-2 → 2 calls; unique uom: uom-1 → 1 call
    expect(productRepo.getProductById).toHaveBeenCalledTimes(2);
    expect(uomRepo.getUomById).toHaveBeenCalledTimes(1);
    expect(prRepo.createDraft).toHaveBeenCalledWith(
      'c1',
      'u1',
      expect.objectContaining({ destinationOutletId: 'outlet-1', totalEstimatedAmount: 16000 }),
    );
  });

  it('should propagate OUTLET.NOT_FOUND when destination outlet is in another company', async () => {
    outletRepo.getOutletById.mockRejectedValue(new Error('OUTLET.NOT_FOUND'));

    const useCase = new CreatePurchaseRequestUseCase(prRepo, outletRepo, productRepo, uomRepo);
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow('OUTLET.NOT_FOUND');
    expect(prRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should reject an expectedDate that is today (validation before repo)', async () => {
    const useCase = new CreatePurchaseRequestUseCase(prRepo, outletRepo, productRepo, uomRepo);
    await expect(
      useCase.execute({ ...payload, expectedDate: isoDaysFromNow(0) }, 'c1', 'u1'),
    ).rejects.toThrow('CREATE_PURCHASE_REQUEST.EXPECTED_DATE_TOO_EARLY');
    expect(outletRepo.getOutletById).not.toHaveBeenCalled();
  });
});

describe('UpdatePurchaseRequestUseCase', () => {
  it('should validate references then delegate to updateDraft', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'outlet-1' } as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    prRepo.updateDraft.mockResolvedValue({ id: 'pr1' } as never);

    const useCase = new UpdatePurchaseRequestUseCase(prRepo, outletRepo, productRepo, uomRepo);
    await useCase.execute('pr1', payload, 'c1', 'u1');

    expect(prRepo.updateDraft).toHaveBeenCalledWith(
      'pr1',
      'c1',
      'u1',
      expect.objectContaining({ totalEstimatedAmount: 16000 }),
    );
  });
});

describe('Status use cases delegate to repository', () => {
  it('submit -> repo.submit', async () => {
    prRepo.submit.mockResolvedValue({ id: 'pr' } as never);
    await new SubmitPurchaseRequestUseCase(prRepo).execute('pr', 'c1', 'u1');
    expect(prRepo.submit).toHaveBeenCalledWith('pr', 'c1', 'u1');
  });

  it('approve -> repo.approve with note', async () => {
    prRepo.approve.mockResolvedValue({ id: 'pr' } as never);
    await new ApprovePurchaseRequestUseCase(prRepo).execute('pr', 'c1', 'u1', 'ok');
    expect(prRepo.approve).toHaveBeenCalledWith('pr', 'c1', 'u1', 'ok');
  });

  it('approve should allow a null note (any amount, no nominal limit)', async () => {
    prRepo.approve.mockResolvedValue({ id: 'pr' } as never);
    await new ApprovePurchaseRequestUseCase(prRepo).execute('pr', 'c1', 'u1', null);
    expect(prRepo.approve).toHaveBeenCalledWith('pr', 'c1', 'u1', null);
  });

  it('reject -> requires a note', async () => {
    const useCase = new RejectPurchaseRequestUseCase(prRepo);
    await expect(useCase.execute('pr', 'c1', 'u1', null)).rejects.toThrow(
      'REJECT_PURCHASE_REQUEST.NOTE_REQUIRED',
    );
    await expect(useCase.execute('pr', 'c1', 'u1', '   ')).rejects.toThrow(
      'REJECT_PURCHASE_REQUEST.NOTE_REQUIRED',
    );
    expect(prRepo.reject).not.toHaveBeenCalled();
  });

  it('reject -> repo.reject with trimmed note', async () => {
    prRepo.reject.mockResolvedValue({ id: 'pr' } as never);
    await new RejectPurchaseRequestUseCase(prRepo).execute('pr', 'c1', 'u1', '  budget  ');
    expect(prRepo.reject).toHaveBeenCalledWith('pr', 'c1', 'u1', 'budget');
  });

  it('cancel -> repo.cancel (note optional)', async () => {
    prRepo.cancel.mockResolvedValue({ id: 'pr' } as never);
    await new CancelPurchaseRequestUseCase(prRepo).execute('pr', 'c1', 'u1', null);
    expect(prRepo.cancel).toHaveBeenCalledWith('pr', 'c1', 'u1', null);
  });

  it('should propagate INVALID_STATUS_TRANSITION from repo', async () => {
    prRepo.submit.mockRejectedValue(new Error('PURCHASE_REQUEST.INVALID_STATUS_TRANSITION'));
    await expect(
      new SubmitPurchaseRequestUseCase(prRepo).execute('pr', 'c1', 'u1'),
    ).rejects.toThrow('PURCHASE_REQUEST.INVALID_STATUS_TRANSITION');
  });
});

describe('GetPurchaseRequestsUseCase', () => {
  it('should throw INVALID_STATUS for an unknown status filter', async () => {
    await expect(
      new GetPurchaseRequestsUseCase(prRepo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('PURCHASE_REQUEST.INVALID_STATUS');
  });

  it('should list with a valid status', async () => {
    prRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetPurchaseRequestsUseCase(prRepo).list(
      { limit: 10, offset: 0, status: 'SUBMITTED' },
      'c1',
    );
    expect(prRepo.list).toHaveBeenCalled();
  });

  it('should pass the orderable picker flag through to the repository', async () => {
    prRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetPurchaseRequestsUseCase(prRepo).list(
      { limit: 10, offset: 0, orderable: true },
      'c1',
    );
    expect(prRepo.list).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ orderable: true }),
    );
  });

  it('should return detail via getById', async () => {
    prRepo.getById.mockResolvedValue({ id: 'pr' } as never);
    const result = await new GetPurchaseRequestsUseCase(prRepo).detail('pr', 'c1');
    expect(result).toEqual({ id: 'pr' });
  });
});

describe('AddPurchaseRequestCommentUseCase', () => {
  it('should default to INTERNAL, verify tenant scope, then persist and return the comment', async () => {
    prRepo.ensureExists.mockResolvedValue(undefined);
    prRepo.addComment.mockResolvedValue({
      id: 'cmt-1',
      category: 'INTERNAL',
      body: 'Please review',
      authorId: 'u1',
      authorName: 'Budi Owner',
      createdAt: new Date(),
    });

    const useCase = new AddPurchaseRequestCommentUseCase(prRepo);
    const result = await useCase.execute('pr1', { body: 'Please review' }, 'c1', 'u1');

    expect(prRepo.ensureExists).toHaveBeenCalledWith('pr1', 'c1');
    expect(prRepo.addComment).toHaveBeenCalledWith('pr1', 'c1', 'u1', {
      category: 'INTERNAL',
      body: 'Please review',
    });
    // authorName is surfaced back to the caller
    expect(result.authorName).toBe('Budi Owner');
  });

  it('should accept an APPROVAL category when explicitly provided', async () => {
    prRepo.ensureExists.mockResolvedValue(undefined);
    prRepo.addComment.mockResolvedValue({ id: 'cmt-1' } as never);

    const useCase = new AddPurchaseRequestCommentUseCase(prRepo);
    await useCase.execute('pr1', { body: 'Approved with note', category: 'APPROVAL' }, 'c1', 'u1');

    expect(prRepo.addComment).toHaveBeenCalledWith(
      'pr1',
      'c1',
      'u1',
      expect.objectContaining({ category: 'APPROVAL', body: 'Approved with note' }),
    );
  });

  it('should reject an empty body before touching the repository', async () => {
    const useCase = new AddPurchaseRequestCommentUseCase(prRepo);
    await expect(useCase.execute('pr1', { body: '   ' }, 'c1', 'u1')).rejects.toThrow(
      'ADD_PURCHASE_REQUEST_COMMENT.BODY_REQUIRED',
    );
    expect(prRepo.ensureExists).not.toHaveBeenCalled();
    expect(prRepo.addComment).not.toHaveBeenCalled();
  });

  it('should reject a SYSTEM category coming from user input (backend-only)', async () => {
    const useCase = new AddPurchaseRequestCommentUseCase(prRepo);
    await expect(
      useCase.execute('pr1', { body: 'hi', category: 'SYSTEM' }, 'c1', 'u1'),
    ).rejects.toThrow('ADD_PURCHASE_REQUEST_COMMENT.CATEGORY_NOT_ALLOWED');
    expect(prRepo.addComment).not.toHaveBeenCalled();
  });

  it('should reject an unknown category', async () => {
    const useCase = new AddPurchaseRequestCommentUseCase(prRepo);
    await expect(
      useCase.execute('pr1', { body: 'hi', category: 'NOPE' }, 'c1', 'u1'),
    ).rejects.toThrow('ADD_PURCHASE_REQUEST_COMMENT.INVALID_CATEGORY');
    expect(prRepo.addComment).not.toHaveBeenCalled();
  });

  it('should propagate PURCHASE_REQUEST.NOT_FOUND when the PR is in another company', async () => {
    prRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_REQUEST.NOT_FOUND'));
    const useCase = new AddPurchaseRequestCommentUseCase(prRepo);
    await expect(useCase.execute('pr1', { body: 'hi' }, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_REQUEST.NOT_FOUND',
    );
    expect(prRepo.addComment).not.toHaveBeenCalled();
  });
});

describe('GetPurchaseRequestCommentsUseCase', () => {
  it('should verify tenant scope then list the thread', async () => {
    prRepo.ensureExists.mockResolvedValue(undefined);
    prRepo.listComments.mockResolvedValue([]);

    const useCase = new GetPurchaseRequestCommentsUseCase(prRepo);
    await useCase.execute('pr1', 'c1');

    expect(prRepo.ensureExists).toHaveBeenCalledWith('pr1', 'c1');
    expect(prRepo.listComments).toHaveBeenCalledWith('pr1', 'c1');
  });

  it('should propagate PURCHASE_REQUEST.NOT_FOUND for a foreign PR', async () => {
    prRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_REQUEST.NOT_FOUND'));
    const useCase = new GetPurchaseRequestCommentsUseCase(prRepo);
    await expect(useCase.execute('pr1', 'c1')).rejects.toThrow('PURCHASE_REQUEST.NOT_FOUND');
    expect(prRepo.listComments).not.toHaveBeenCalled();
  });
});
