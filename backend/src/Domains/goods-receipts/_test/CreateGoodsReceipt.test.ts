import {
  CreateGoodsReceipt,
  buildOutstandingMap,
  validateItemsAgainstOutstanding,
  validateBatchRequirements,
  ResolvedGoodsReceiptItem,
  SourcePoItem,
  OutstandingPoItem,
} from '../entities/CreateGoodsReceipt';

const validPayload = {
  purchaseOrderId: 'po-1',
  receiveDate: '2026-10-10',
  items: [
    {
      purchaseOrderItemId: 'poi-1',
      productId: 'prod-1',
      acceptedQuantity: 3,
      rejectedQuantity: 0,
      uomId: 'uom-1',
    },
  ],
};

describe('CreateGoodsReceipt entity', () => {
  it('accepts a valid payload and trims strings', () => {
    const gr = new CreateGoodsReceipt(validPayload);
    expect(gr.purchaseOrderId).toBe('po-1');
    expect(gr.receiveDate).toBe('2026-10-10');
    expect(gr.items).toHaveLength(1);
    expect(gr.items![0].purchaseOrderItemId).toBe('poi-1');
  });

  it('leaves items null when none are supplied (prefill mode)', () => {
    const { items, ...noItems } = validPayload;
    void items;
    const gr = new CreateGoodsReceipt(noItems);
    expect(gr.items).toBeNull();
  });

  it('rejects a missing purchaseOrderId', () => {
    expect(() => new CreateGoodsReceipt({ receiveDate: '2026-10-10' })).toThrow(
      'CREATE_GOODS_RECEIPT.PURCHASE_ORDER_REQUIRED',
    );
  });

  it('rejects an invalid receive date', () => {
    expect(
      () => new CreateGoodsReceipt({ purchaseOrderId: 'po-1', receiveDate: 'not-a-date' }),
    ).toThrow('CREATE_GOODS_RECEIPT.RECEIVE_DATE_INVALID');
  });

  it('rejects an item missing the PO item reference', () => {
    expect(
      () =>
        new CreateGoodsReceipt({
          ...validPayload,
          items: [{ productId: 'prod-1', acceptedQuantity: 1, rejectedQuantity: 0, uomId: 'uom-1' }],
        }),
    ).toThrow('CREATE_GOODS_RECEIPT.ITEM_PO_ITEM_REQUIRED');
  });

  it('rejects a negative accepted quantity', () => {
    expect(
      () =>
        new CreateGoodsReceipt({
          ...validPayload,
          items: [
            {
              purchaseOrderItemId: 'poi-1',
              productId: 'prod-1',
              acceptedQuantity: -1,
              rejectedQuantity: 0,
              uomId: 'uom-1',
            },
          ],
        }),
    ).toThrow('CREATE_GOODS_RECEIPT.ITEM_ACCEPTED_QTY_MUST_BE_NON_NEGATIVE');
  });

  it('rejects a non-numeric rejected quantity', () => {
    expect(
      () =>
        new CreateGoodsReceipt({
          ...validPayload,
          items: [
            {
              purchaseOrderItemId: 'poi-1',
              productId: 'prod-1',
              acceptedQuantity: 1,
              rejectedQuantity: 'x',
              uomId: 'uom-1',
            },
          ],
        }),
    ).toThrow('CREATE_GOODS_RECEIPT.ITEM_REJECTED_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  });
});

describe('buildOutstandingMap', () => {
  const poItems: SourcePoItem[] = [
    { id: 'poi-1', productId: 'prod-1', quantity: 10, uomId: 'uom-1' },
    { id: 'poi-2', productId: 'prod-2', quantity: 5, uomId: 'uom-1' },
  ];

  it('computes outstanding = qtyPO - consumed, clamped at 0', () => {
    const consumed = new Map<string, number>([
      ['poi-1', 4],
      ['poi-2', 7], // over-consumed → clamp to 0
    ]);
    const result = buildOutstandingMap(poItems, consumed);
    expect(result).toEqual([
      expect.objectContaining({
        purchaseOrderItemId: 'poi-1',
        orderedQuantity: 10,
        receivedQuantity: 4,
        outstandingQuantity: 6,
      }),
      expect.objectContaining({
        purchaseOrderItemId: 'poi-2',
        orderedQuantity: 5,
        receivedQuantity: 7,
        outstandingQuantity: 0,
      }),
    ]);
  });

  it('treats a missing consumption key as 0', () => {
    const result = buildOutstandingMap(poItems, new Map());
    expect(result[0].outstandingQuantity).toBe(10);
    expect(result[1].outstandingQuantity).toBe(5);
  });
});

describe('validateItemsAgainstOutstanding', () => {
  const outstanding: OutstandingPoItem[] = [
    {
      purchaseOrderItemId: 'poi-1',
      productId: 'prod-1',
      orderedQuantity: 10,
      receivedQuantity: 4,
      outstandingQuantity: 6,
      uomId: 'uom-1',
    },
  ];

  function item(over: Partial<ResolvedGoodsReceiptItem> = {}): ResolvedGoodsReceiptItem {
    return {
      purchaseOrderItemId: 'poi-1',
      productId: 'prod-1',
      orderedQuantity: 10,
      acceptedQuantity: 3,
      rejectedQuantity: 1,
      uomId: 'uom-1',
      batchNumber: null,
      lotNumber: null,
      expiryDate: null,
      ...over,
    };
  }

  it('accepts accepted + rejected within outstanding', () => {
    expect(() => validateItemsAgainstOutstanding([item()], outstanding)).not.toThrow();
  });

  it('rejects a PO line not present in the PO', () => {
    expect(() =>
      validateItemsAgainstOutstanding([item({ purchaseOrderItemId: 'poi-x' })], outstanding),
    ).toThrow('GOODS_RECEIPT.ITEM_NOT_IN_PO');
  });

  it('rejects a product that does not match the PO line', () => {
    expect(() =>
      validateItemsAgainstOutstanding([item({ productId: 'prod-other' })], outstanding),
    ).toThrow('GOODS_RECEIPT.ITEM_PRODUCT_MISMATCH');
  });

  it('rejects duplicate PO lines in one GR', () => {
    expect(() => validateItemsAgainstOutstanding([item(), item()], outstanding)).toThrow(
      'GOODS_RECEIPT.DUPLICATE_ITEM',
    );
  });

  it('rejects a line that received nothing (accepted + rejected = 0)', () => {
    expect(() =>
      validateItemsAgainstOutstanding(
        [item({ acceptedQuantity: 0, rejectedQuantity: 0 })],
        outstanding,
      ),
    ).toThrow('GOODS_RECEIPT.ITEM_NOTHING_RECEIVED');
  });

  it('rejects received quantity exceeding outstanding', () => {
    expect(() =>
      validateItemsAgainstOutstanding(
        [item({ acceptedQuantity: 6, rejectedQuantity: 1 })], // 7 > 6
        outstanding,
      ),
    ).toThrow('GOODS_RECEIPT.QTY_EXCEEDS_OUTSTANDING');
  });
});

describe('validateBatchRequirements', () => {
  function item(over: Partial<ResolvedGoodsReceiptItem> = {}): ResolvedGoodsReceiptItem {
    return {
      purchaseOrderItemId: 'poi-1',
      productId: 'prod-1',
      orderedQuantity: 10,
      acceptedQuantity: 3,
      rejectedQuantity: 0,
      uomId: 'uom-1',
      batchNumber: null,
      lotNumber: null,
      expiryDate: null,
      ...over,
    };
  }

  it('requires batch for a batch-tracked product with accepted > 0', () => {
    expect(() =>
      validateBatchRequirements([item()], new Map([['prod-1', true]])),
    ).toThrow('GOODS_RECEIPT.BATCH_REQUIRED');
  });

  it('requires expiry for a batch-tracked product with accepted > 0 even if batch is present', () => {
    expect(() =>
      validateBatchRequirements(
        [item({ batchNumber: 'B1' })],
        new Map([['prod-1', true]]),
      ),
    ).toThrow('GOODS_RECEIPT.EXPIRY_REQUIRED');
  });

  it('passes when a batch-tracked accepted line has batch + expiry', () => {
    expect(() =>
      validateBatchRequirements(
        [item({ batchNumber: 'B1', expiryDate: '2026-12-31' })],
        new Map([['prod-1', true]]),
      ),
    ).not.toThrow();
  });

  it('does not require batch/expiry for a non-batch product', () => {
    expect(() =>
      validateBatchRequirements([item()], new Map([['prod-1', false]])),
    ).not.toThrow();
  });

  it('does not require batch/expiry for a batch-tracked product with accepted = 0 (rejected only)', () => {
    expect(() =>
      validateBatchRequirements(
        [item({ acceptedQuantity: 0, rejectedQuantity: 2 })],
        new Map([['prod-1', true]]),
      ),
    ).not.toThrow();
  });
});
