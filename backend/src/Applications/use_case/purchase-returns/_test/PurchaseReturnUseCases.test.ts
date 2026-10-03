import { CreatePurchaseReturnUseCase } from '../CreatePurchaseReturnUseCase';
import { SubmitPurchaseReturnUseCase } from '../SubmitPurchaseReturnUseCase';
import { CompletePurchaseReturnUseCase } from '../CompletePurchaseReturnUseCase';
import { CancelPurchaseReturnUseCase } from '../CancelPurchaseReturnUseCase';
import { GetReturnableUseCase } from '../GetReturnableUseCase';
import { PurchaseReturnRepository, ReturnableLine } from '../../../../Domains/purchase-returns/PurchaseReturnRepository';
import { GoodsReceiptRepository } from '../../../../Domains/goods-receipts/GoodsReceiptRepository';
import { SupplierRepository } from '../../../../Domains/suppliers/SupplierRepository';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';

const prRepo: jest.Mocked<PurchaseReturnRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  getReturnable: jest.fn(),
  submit: jest.fn(),
  complete: jest.fn(),
  cancel: jest.fn(),
} as unknown as jest.Mocked<PurchaseReturnRepository>;

const grRepo: jest.Mocked<GoodsReceiptRepository> = {
  getById: jest.fn(),
} as unknown as jest.Mocked<GoodsReceiptRepository>;

const supplierRepo: jest.Mocked<SupplierRepository> = {
  getSupplierById: jest.fn(),
} as unknown as jest.Mocked<SupplierRepository>;

const outletRepo: jest.Mocked<OutletRepository> = {
  getOutletById: jest.fn(),
} as unknown as jest.Mocked<OutletRepository>;

function completedGr(over: Record<string, unknown> = {}) {
  return {
    id: 'gr1',
    purchaseOrderId: 'po1',
    supplierId: 'sup1',
    destinationOutletId: 'o1',
    status: 'COMPLETED',
    ...over,
  };
}

function returnableLine(over: Partial<ReturnableLine> = {}): ReturnableLine {
  return {
    goodsReceiptItemId: 'gri1',
    sourceBatchId: 'batch1',
    sourceMovementId: 'mov1',
    productId: 'prod1',
    productSku: 'SKU-1',
    productName: 'Flour',
    uomId: 'uom1',
    uomCode: 'KG',
    batchNumber: 'B-001',
    lotNumber: null,
    expiredDate: new Date('2026-12-31'),
    postedAcceptedQuantity: 10,
    completedReturnQuantity: 0,
    submittedReturnQuantity: 0,
    returnableQuantity: 10,
    ...over,
  };
}

const basePayload = {
  goodsReceiptId: 'gr1',
  returnDate: '2026-10-10',
  items: [
    {
      goodsReceiptItemId: 'gri1',
      returnQuantity: 4,
      reason: 'DAMAGED',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  grRepo.getById.mockResolvedValue(completedGr() as never);
  prRepo.getReturnable.mockResolvedValue([returnableLine()]);
  supplierRepo.getSupplierById.mockResolvedValue({
    id: 'sup1',
    code: 'SUP-01',
    name: 'Vendor A',
  } as never);
  outletRepo.getOutletById.mockResolvedValue({
    id: 'o1',
    code: 'OUT-01',
    name: 'Outlet A',
  } as never);
  prRepo.createDraft.mockImplementation(((_c: string, _u: string, data: unknown) =>
    Promise.resolve({ status: 'DRAFT', ...(data as object) } as never)) as never);
});

describe('CreatePurchaseReturnUseCase', () => {
  const useCase = new CreatePurchaseReturnUseCase(prRepo, grRepo, supplierRepo, outletRepo);

  it('creates a draft with server-resolved snapshots from the GR returnable line', async () => {
    await useCase.execute(basePayload, 'c1', 'u1');

    expect(prRepo.createDraft).toHaveBeenCalledTimes(1);
    const data = prRepo.createDraft.mock.calls[0][2];
    expect(data.goodsReceiptId).toBe('gr1');
    expect(data.purchaseOrderId).toBe('po1');
    expect(data.supplierCode).toBe('SUP-01');
    expect(data.outletCode).toBe('OUT-01');
    expect(data.items).toHaveLength(1);
    expect(data.items[0].sourceMovementId).toBe('mov1');
    expect(data.items[0].sourceBatchId).toBe('batch1');
    expect(data.items[0].postedAcceptedQuantity).toBe(10);
    expect(data.items[0].returnQuantity).toBe(4);
  });

  it('rejects reason OTHER without a description (payload validation)', async () => {
    const payload = {
      ...basePayload,
      items: [{ goodsReceiptItemId: 'gri1', returnQuantity: 4, reason: 'OTHER' }],
    };
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow(
      'CREATE_PURCHASE_RETURN.ITEM_REASON_DESCRIPTION_REQUIRED',
    );
    expect(prRepo.createDraft).not.toHaveBeenCalled();
  });

  it('accepts reason OTHER with a description', async () => {
    const payload = {
      ...basePayload,
      items: [
        {
          goodsReceiptItemId: 'gri1',
          returnQuantity: 4,
          reason: 'OTHER',
          reasonDescription: 'Customer complaint',
        },
      ],
    };
    await useCase.execute(payload, 'c1', 'u1');
    const data = prRepo.createDraft.mock.calls[0][2];
    expect(data.items[0].reason).toBe('OTHER');
    expect(data.items[0].reasonDescription).toBe('Customer complaint');
  });

  it('rejects an invalid reason value', async () => {
    const payload = {
      ...basePayload,
      items: [{ goodsReceiptItemId: 'gri1', returnQuantity: 4, reason: 'NONSENSE' }],
    };
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow(
      'CREATE_PURCHASE_RETURN.ITEM_REASON_INVALID',
    );
  });

  it('rejects a non-positive return quantity', async () => {
    const payload = {
      ...basePayload,
      items: [{ goodsReceiptItemId: 'gri1', returnQuantity: 0, reason: 'DAMAGED' }],
    };
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow(
      'CREATE_PURCHASE_RETURN.ITEM_QTY_MUST_BE_POSITIVE',
    );
  });

  it('rejects returnQuantity greater than the returnable quantity', async () => {
    prRepo.getReturnable.mockResolvedValue([returnableLine({ returnableQuantity: 3 })]);
    const payload = {
      ...basePayload,
      items: [{ goodsReceiptItemId: 'gri1', returnQuantity: 4, reason: 'DAMAGED' }],
    };
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_RETURN.RETURN_QTY_EXCEEDS_RETURNABLE',
    );
  });

  it('rejects an item that is not among the GR returnable lines', async () => {
    const payload = {
      ...basePayload,
      items: [{ goodsReceiptItemId: 'unknown', returnQuantity: 1, reason: 'DAMAGED' }],
    };
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_RETURN.ITEM_NOT_IN_GOODS_RECEIPT',
    );
  });

  it('rejects a duplicate GR item in one document', async () => {
    const payload = {
      ...basePayload,
      items: [
        { goodsReceiptItemId: 'gri1', returnQuantity: 2, reason: 'DAMAGED' },
        { goodsReceiptItemId: 'gri1', returnQuantity: 1, reason: 'DAMAGED' },
      ],
    };
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_RETURN.DUPLICATE_ITEM',
    );
  });
});

describe('Submit/Complete/Cancel use cases delegate to the repository with trimmed note', () => {
  it('submit trims the note', async () => {
    prRepo.submit.mockResolvedValue({ status: 'SUBMITTED' } as never);
    await new SubmitPurchaseReturnUseCase(prRepo).execute('ret1', 'c1', 'u1', '  go  ');
    expect(prRepo.submit).toHaveBeenCalledWith('ret1', 'c1', 'u1', 'go');
  });

  it('complete trims the note', async () => {
    prRepo.complete.mockResolvedValue({ status: 'COMPLETED' } as never);
    await new CompletePurchaseReturnUseCase(prRepo).execute('ret1', 'c1', 'u1', null);
    expect(prRepo.complete).toHaveBeenCalledWith('ret1', 'c1', 'u1', null);
  });

  it('cancel trims the note', async () => {
    prRepo.cancel.mockResolvedValue({ status: 'CANCELLED' } as never);
    await new CancelPurchaseReturnUseCase(prRepo).execute('ret1', 'c1', 'u1', ' wrong ');
    expect(prRepo.cancel).toHaveBeenCalledWith('ret1', 'c1', 'u1', 'wrong');
  });
});

describe('GetReturnableUseCase', () => {
  it('returns the returnable lines for a GR', async () => {
    prRepo.getReturnable.mockResolvedValue([returnableLine()]);
    const result = await new GetReturnableUseCase(prRepo).execute('gr1', 'c1');
    expect(result.goodsReceiptId).toBe('gr1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].returnableQuantity).toBe(10);
  });
});
