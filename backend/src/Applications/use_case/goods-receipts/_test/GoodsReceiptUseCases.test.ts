import { CreateGoodsReceiptUseCase } from '../CreateGoodsReceiptUseCase';
import { UpdateGoodsReceiptUseCase } from '../UpdateGoodsReceiptUseCase';
import { CancelGoodsReceiptUseCase } from '../CancelGoodsReceiptUseCase';
import { CompleteGoodsReceiptUseCase } from '../CompleteGoodsReceiptUseCase';
import { GetGoodsReceiptsUseCase } from '../GetGoodsReceiptsUseCase';
import { GetGoodsReceiptOutstandingUseCase } from '../GetGoodsReceiptOutstandingUseCase';
import { GoodsReceiptRepository } from '../../../../Domains/goods-receipts/GoodsReceiptRepository';
import { PurchaseOrderRepository } from '../../../../Domains/purchase-orders/PurchaseOrderRepository';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../../Domains/uoms/UomRepository';

const grRepo: jest.Mocked<GoodsReceiptRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  getConsumedQtyByPoItem: jest.fn(),
  cancel: jest.fn(),
  complete: jest.fn(),
} as unknown as jest.Mocked<GoodsReceiptRepository>;

const poRepo: jest.Mocked<PurchaseOrderRepository> = {
  getById: jest.fn(),
} as unknown as jest.Mocked<PurchaseOrderRepository>;

const productRepo: jest.Mocked<ProductRepository> = {
  getProductById: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const uomRepo: jest.Mocked<UomRepository> = {
  getUomById: jest.fn(),
} as unknown as jest.Mocked<UomRepository>;

/** An APPROVED PO with two lines, used as the valid source for GR creation. */
function approvedPo(over: Record<string, unknown> = {}) {
  return {
    id: 'po-1',
    companyId: 'c1',
    status: 'APPROVED',
    supplierId: 'sup-1',
    destinationOutletId: 'outlet-1',
    items: [
      { id: 'poi-1', productId: 'prod-1', quantity: 10, uomId: 'uom-1' },
      { id: 'poi-2', productId: 'prod-2', quantity: 5, uomId: 'uom-1' },
    ],
    ...over,
  };
}

/** A non-batch product by default. */
function product(id: string, isBatchTracked = false) {
  return { id, isBatchTracked };
}

const basePayload = {
  purchaseOrderId: 'po-1',
  receiveDate: '2026-10-10',
  items: [
    {
      purchaseOrderItemId: 'poi-1',
      productId: 'prod-1',
      acceptedQuantity: 6,
      rejectedQuantity: 1,
      uomId: 'uom-1',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no sibling GR consumption → outstanding == full PO quantity.
  grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map<string, number>());
  // Default products are non-batch.
  productRepo.getProductById.mockImplementation((id: string) =>
    Promise.resolve(product(id) as never),
  );
  uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
});

function createUseCase() {
  return new CreateGoodsReceiptUseCase(grRepo, poRepo, productRepo, uomRepo);
}

describe('CreateGoodsReceiptUseCase', () => {
  it('creates from an APPROVED PO, snapshotting supplier/outlet/ordered qty + numbering via repo', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    grRepo.createDraft.mockResolvedValue({ id: 'gr1' } as never);

    await createUseCase().execute(basePayload, 'c1', 'u1');

    expect(poRepo.getById).toHaveBeenCalledWith('po-1', 'c1');
    expect(grRepo.getConsumedQtyByPoItem).toHaveBeenCalledWith('po-1', 'c1');
    expect(grRepo.createDraft).toHaveBeenCalledWith(
      'c1',
      'u1',
      expect.objectContaining({
        purchaseOrderId: 'po-1',
        supplierId: 'sup-1', // inherited from the PO
        destinationOutletId: 'outlet-1', // inherited from the PO
      }),
    );
    const arg = grRepo.createDraft.mock.calls[0][2];
    expect(arg.items).toHaveLength(1);
    // ordered_quantity snapshotted from the PO line (10), not from the body.
    expect(arg.items[0]).toEqual(
      expect.objectContaining({
        purchaseOrderItemId: 'poi-1',
        orderedQuantity: 10,
        acceptedQuantity: 6,
        rejectedQuantity: 1,
      }),
    );
  });

  it('rejects creation when the PO is not APPROVED', async () => {
    poRepo.getById.mockResolvedValue(approvedPo({ status: 'SUBMITTED' }) as never);

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'GOODS_RECEIPT.PO_NOT_APPROVED',
    );
    expect(grRepo.createDraft).not.toHaveBeenCalled();
  });

  it('propagates PURCHASE_ORDER.NOT_FOUND for a foreign/missing PO (company-scope)', async () => {
    poRepo.getById.mockRejectedValue(new Error('PURCHASE_ORDER.NOT_FOUND'));

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.NOT_FOUND',
    );
    expect(grRepo.createDraft).not.toHaveBeenCalled();
  });

  it('rejects received (accepted + rejected) exceeding the PO line outstanding', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    // poi-1 PO qty 10, a sibling GR consumed 6 → outstanding 4; asking 7 fails.
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map([['poi-1', 6]]));

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'GOODS_RECEIPT.QTY_EXCEEDS_OUTSTANDING',
    );
    expect(grRepo.createDraft).not.toHaveBeenCalled();
  });

  it('accepts received exactly equal to the remaining outstanding', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    grRepo.createDraft.mockResolvedValue({ id: 'gr1' } as never);
    // poi-1 PO qty 10, consumed 3 → outstanding 7; receiving exactly 7 succeeds.
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map([['poi-1', 3]]));

    await createUseCase().execute(
      {
        ...basePayload,
        items: [
          {
            purchaseOrderItemId: 'poi-1',
            productId: 'prod-1',
            acceptedQuantity: 7,
            rejectedQuantity: 0,
            uomId: 'uom-1',
          },
        ],
      },
      'c1',
      'u1',
    );

    expect(grRepo.createDraft).toHaveBeenCalled();
  });

  it('rejects a product that does not belong to the source PO line', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);

    await expect(
      createUseCase().execute(
        {
          ...basePayload,
          items: [
            {
              purchaseOrderItemId: 'poi-1',
              productId: 'prod-foreign',
              acceptedQuantity: 1,
              rejectedQuantity: 0,
              uomId: 'uom-1',
            },
          ],
        },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('GOODS_RECEIPT.ITEM_PRODUCT_MISMATCH');
    expect(grRepo.createDraft).not.toHaveBeenCalled();
  });

  it('requires batch + expiry for an accepted batch-tracked product', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    productRepo.getProductById.mockImplementation((id: string) =>
      Promise.resolve(product(id, true) as never),
    );

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'GOODS_RECEIPT.BATCH_REQUIRED',
    );
    expect(grRepo.createDraft).not.toHaveBeenCalled();
  });

  it('accepts an accepted batch-tracked product when batch + expiry are provided', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    productRepo.getProductById.mockImplementation((id: string) =>
      Promise.resolve(product(id, true) as never),
    );
    grRepo.createDraft.mockResolvedValue({ id: 'gr1' } as never);

    await createUseCase().execute(
      {
        ...basePayload,
        items: [
          {
            purchaseOrderItemId: 'poi-1',
            productId: 'prod-1',
            acceptedQuantity: 6,
            rejectedQuantity: 0,
            uomId: 'uom-1',
            batchNumber: 'B-001',
            expiryDate: '2026-12-31',
          },
        ],
      },
      'c1',
      'u1',
    );

    expect(grRepo.createDraft).toHaveBeenCalled();
    const arg = grRepo.createDraft.mock.calls[0][2];
    expect(arg.items[0]).toEqual(
      expect.objectContaining({ batchNumber: 'B-001', expiryDate: '2026-12-31' }),
    );
  });

  it('prefills only outstanding>0 lines (accepted = outstanding, rejected = 0) when body omits items', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    grRepo.createDraft.mockResolvedValue({ id: 'gr1' } as never);
    // poi-1: PO 10, consumed 4 → outstanding 6; poi-2: PO 5, consumed 5 → 0.
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map([['poi-1', 4], ['poi-2', 5]]));

    const { items, ...noItems } = basePayload;
    void items;
    await createUseCase().execute(noItems, 'c1', 'u1');

    const arg = grRepo.createDraft.mock.calls[0][2];
    expect(arg.items).toHaveLength(1);
    expect(arg.items[0]).toEqual(
      expect.objectContaining({
        purchaseOrderItemId: 'poi-1',
        acceptedQuantity: 6,
        rejectedQuantity: 0,
        orderedQuantity: 10,
      }),
    );
  });

  it('rejects create (prefill mode) when every PO line is fully received', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map([['poi-1', 10], ['poi-2', 5]]));

    const { items, ...noItems } = basePayload;
    void items;
    await expect(createUseCase().execute(noItems, 'c1', 'u1')).rejects.toThrow(
      'GOODS_RECEIPT.NO_OUTSTANDING_ITEMS',
    );
    expect(grRepo.createDraft).not.toHaveBeenCalled();
  });

  it('validates every item product/uom against the company', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    productRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'PRODUCT.NOT_FOUND',
    );
    expect(grRepo.createDraft).not.toHaveBeenCalled();
  });
});

describe('UpdateGoodsReceiptUseCase', () => {
  function updateUseCase() {
    return new UpdateGoodsReceiptUseCase(grRepo, poRepo, productRepo, uomRepo);
  }

  it('excludes the edited GR from outstanding and delegates to updateDraft', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    grRepo.updateDraft.mockResolvedValue({ id: 'gr1' } as never);
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map<string, number>());

    await updateUseCase().execute('gr1', basePayload, 'c1', 'u1');

    expect(grRepo.getConsumedQtyByPoItem).toHaveBeenCalledWith('po-1', 'c1', 'gr1');
    expect(grRepo.updateDraft).toHaveBeenCalledWith(
      'gr1',
      'c1',
      'u1',
      expect.objectContaining({ purchaseOrderId: 'po-1', supplierId: 'sup-1' }),
    );
  });

  it('propagates ONLY_EDITABLE_STATUS from the repository', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    grRepo.updateDraft.mockRejectedValue(new Error('GOODS_RECEIPT.ONLY_EDITABLE_STATUS'));

    await expect(updateUseCase().execute('gr1', basePayload, 'c1', 'u1')).rejects.toThrow(
      'GOODS_RECEIPT.ONLY_EDITABLE_STATUS',
    );
  });

  it('rejects an update exceeding the outstanding left by other GRs', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    // Another GR consumed 6 of poi-1 (PO 10) → outstanding for this edit is 4.
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map([['poi-1', 6]]));

    await expect(updateUseCase().execute('gr1', basePayload, 'c1', 'u1')).rejects.toThrow(
      'GOODS_RECEIPT.QTY_EXCEEDS_OUTSTANDING',
    );
    expect(grRepo.updateDraft).not.toHaveBeenCalled();
  });
});

describe('CancelGoodsReceiptUseCase', () => {
  it('delegates to repo.cancel with a trimmed note', async () => {
    grRepo.cancel.mockResolvedValue({ id: 'gr' } as never);
    await new CancelGoodsReceiptUseCase(grRepo).execute('gr', 'c1', 'u1', '  wrong delivery  ');
    expect(grRepo.cancel).toHaveBeenCalledWith('gr', 'c1', 'u1', 'wrong delivery');
  });

  it('allows a null note', async () => {
    grRepo.cancel.mockResolvedValue({ id: 'gr' } as never);
    await new CancelGoodsReceiptUseCase(grRepo).execute('gr', 'c1', 'u1', null);
    expect(grRepo.cancel).toHaveBeenCalledWith('gr', 'c1', 'u1', null);
  });

  it('propagates INVALID_STATUS_TRANSITION from the repository (e.g. COMPLETED cannot cancel)', async () => {
    grRepo.cancel.mockRejectedValue(new Error('GOODS_RECEIPT.INVALID_STATUS_TRANSITION'));
    await expect(
      new CancelGoodsReceiptUseCase(grRepo).execute('gr', 'c1', 'u1', null),
    ).rejects.toThrow('GOODS_RECEIPT.INVALID_STATUS_TRANSITION');
  });
});

describe('CompleteGoodsReceiptUseCase', () => {
  it('delegates to repo.complete with a trimmed note (atomic posting owned by repo)', async () => {
    grRepo.complete.mockResolvedValue({ id: 'gr', status: 'COMPLETED' } as never);
    const result = await new CompleteGoodsReceiptUseCase(grRepo).execute(
      'gr',
      'c1',
      'u1',
      '  all received  ',
    );
    expect(grRepo.complete).toHaveBeenCalledWith('gr', 'c1', 'u1', 'all received');
    expect(result).toEqual({ id: 'gr', status: 'COMPLETED' });
  });

  it('allows a null note', async () => {
    grRepo.complete.mockResolvedValue({ id: 'gr' } as never);
    await new CompleteGoodsReceiptUseCase(grRepo).execute('gr', 'c1', 'u1', null);
    expect(grRepo.complete).toHaveBeenCalledWith('gr', 'c1', 'u1', null);
  });

  it('propagates INVALID_STATUS_TRANSITION when the GR is not a DRAFT', async () => {
    grRepo.complete.mockRejectedValue(new Error('GOODS_RECEIPT.INVALID_STATUS_TRANSITION'));
    await expect(
      new CompleteGoodsReceiptUseCase(grRepo).execute('gr', 'c1', 'u1', null),
    ).rejects.toThrow('GOODS_RECEIPT.INVALID_STATUS_TRANSITION');
  });

  it('propagates DUPLICATE_MOVEMENT_SOURCE (double-post guard) from the repository', async () => {
    grRepo.complete.mockRejectedValue(new Error('INVENTORY.DUPLICATE_MOVEMENT_SOURCE'));
    await expect(
      new CompleteGoodsReceiptUseCase(grRepo).execute('gr', 'c1', 'u1', null),
    ).rejects.toThrow('INVENTORY.DUPLICATE_MOVEMENT_SOURCE');
  });
});

describe('GetGoodsReceiptsUseCase', () => {
  it('throws INVALID_STATUS for an unknown status filter', async () => {
    await expect(
      new GetGoodsReceiptsUseCase(grRepo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('GOODS_RECEIPT.INVALID_STATUS');
  });

  it('lists with a valid status and filters', async () => {
    grRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetGoodsReceiptsUseCase(grRepo).list(
      { limit: 10, offset: 0, status: 'DRAFT', purchaseOrderId: 'po-1' },
      'c1',
    );
    expect(grRepo.list).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ status: 'DRAFT', purchaseOrderId: 'po-1' }),
    );
  });

  it('returns detail via getById', async () => {
    grRepo.getById.mockResolvedValue({ id: 'gr' } as never);
    const result = await new GetGoodsReceiptsUseCase(grRepo).detail('gr', 'c1');
    expect(result).toEqual({ id: 'gr' });
  });
});

describe('GetGoodsReceiptOutstandingUseCase', () => {
  function outstandingUseCase() {
    return new GetGoodsReceiptOutstandingUseCase(grRepo, poRepo);
  }

  it('returns outstanding = PO qty minus consumed, with productId/uom per line', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    // poi-1 consumed 4 (outstanding 6); poi-2 nothing (outstanding 5).
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map([['poi-1', 4]]));

    const result = await outstandingUseCase().execute('po-1', 'c1');

    expect(poRepo.getById).toHaveBeenCalledWith('po-1', 'c1');
    expect(grRepo.getConsumedQtyByPoItem).toHaveBeenCalledWith('po-1', 'c1', undefined);
    expect(result.purchaseOrderId).toBe('po-1');
    expect(result.items).toEqual([
      expect.objectContaining({
        purchaseOrderItemId: 'poi-1',
        productId: 'prod-1',
        orderedQuantity: 10,
        receivedQuantity: 4,
        outstandingQuantity: 6,
        uomId: 'uom-1',
      }),
      expect.objectContaining({
        purchaseOrderItemId: 'poi-2',
        productId: 'prod-2',
        orderedQuantity: 5,
        receivedQuantity: 0,
        outstandingQuantity: 5,
      }),
    ]);
  });

  it('clamps outstanding at 0 when consumption meets or exceeds the PO qty', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map([['poi-1', 10], ['poi-2', 5]]));

    const result = await outstandingUseCase().execute('po-1', 'c1');
    expect(result.items.every((i) => i.outstandingQuantity === 0)).toBe(true);
  });

  it('forwards excludeGoodsReceiptId for edit mode', async () => {
    poRepo.getById.mockResolvedValue(approvedPo() as never);
    grRepo.getConsumedQtyByPoItem.mockResolvedValue(new Map<string, number>());

    await outstandingUseCase().execute('po-1', 'c1', 'gr-x');

    expect(grRepo.getConsumedQtyByPoItem).toHaveBeenCalledWith('po-1', 'c1', 'gr-x');
  });

  it('propagates PURCHASE_ORDER.NOT_FOUND for a foreign/missing PO', async () => {
    poRepo.getById.mockRejectedValue(new Error('PURCHASE_ORDER.NOT_FOUND'));

    await expect(outstandingUseCase().execute('po-x', 'c1')).rejects.toThrow(
      'PURCHASE_ORDER.NOT_FOUND',
    );
    expect(grRepo.getConsumedQtyByPoItem).not.toHaveBeenCalled();
  });
});
