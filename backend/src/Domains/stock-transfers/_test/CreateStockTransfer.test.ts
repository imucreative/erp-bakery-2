import { CreateStockTransfer } from '../entities/CreateStockTransfer';

const validItem = { sourceBatchId: 'batch-uuid', productId: 'product-uuid', qty: 5 };
const validPayload = {
  sourceOutletId: 'src-outlet',
  destinationOutletId: 'dst-outlet',
  transferDate: '2026-09-28',
  notes: 'kirim',
  items: [validItem],
};

describe('CreateStockTransfer', () => {
  it('should build entity with normalized fields', () => {
    const e = new CreateStockTransfer(validPayload);
    expect(e.sourceOutletId).toBe('src-outlet');
    expect(e.destinationOutletId).toBe('dst-outlet');
    expect(e.items).toHaveLength(1);
    expect(e.items[0].qty).toBe(5);
  });

  it('should default transferDate and notes to null when absent', () => {
    const e = new CreateStockTransfer({
      sourceOutletId: 'a',
      destinationOutletId: 'b',
      items: [validItem],
    });
    expect(e.transferDate).toBeNull();
    expect(e.notes).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when outlets missing', () => {
    expect(
      () => new CreateStockTransfer({ sourceOutletId: '', destinationOutletId: 'b', items: [validItem] }),
    ).toThrow('CREATE_STOCK_TRANSFER.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw SAME_OUTLET when source equals destination', () => {
    expect(
      () =>
        new CreateStockTransfer({
          sourceOutletId: 'same',
          destinationOutletId: 'same',
          items: [validItem],
        }),
    ).toThrow('CREATE_STOCK_TRANSFER.SAME_OUTLET');
  });

  it('should throw ITEMS_REQUIRED when items empty', () => {
    expect(() => new CreateStockTransfer({ ...validPayload, items: [] })).toThrow(
      'CREATE_STOCK_TRANSFER.ITEMS_REQUIRED',
    );
  });

  it('should throw ITEM_BATCH_REQUIRED when sourceBatchId missing', () => {
    expect(
      () =>
        new CreateStockTransfer({ ...validPayload, items: [{ ...validItem, sourceBatchId: '' }] }),
    ).toThrow('CREATE_STOCK_TRANSFER.ITEM_BATCH_REQUIRED');
  });

  it('should throw ITEM_QTY_MUST_BE_POSITIVE for zero qty', () => {
    expect(
      () => new CreateStockTransfer({ ...validPayload, items: [{ ...validItem, qty: 0 }] }),
    ).toThrow('CREATE_STOCK_TRANSFER.ITEM_QTY_MUST_BE_POSITIVE');
  });

  it('should throw ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION for non-number qty', () => {
    expect(
      () =>
        new CreateStockTransfer({
          ...validPayload,
          items: [{ ...validItem, qty: 'x' as unknown as number }],
        }),
    ).toThrow('CREATE_STOCK_TRANSFER.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  });
});
