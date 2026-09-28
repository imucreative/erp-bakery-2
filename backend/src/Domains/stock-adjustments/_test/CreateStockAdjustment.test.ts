import { CreateStockAdjustment } from '../entities/CreateStockAdjustment';

const validItem = {
  batchId: 'batch-uuid',
  productId: 'product-uuid',
  direction: 'OUT',
  qty: 3,
  reason: 'DAMAGED',
  reasonDescription: 'Rusak saat handling',
};

const validPayload = {
  outletId: 'outlet-uuid',
  adjustmentDate: '2026-09-28',
  notes: 'koreksi',
  items: [validItem],
};

describe('CreateStockAdjustment', () => {
  it('should build entity with normalized fields', () => {
    const e = new CreateStockAdjustment(validPayload);
    expect(e.outletId).toBe('outlet-uuid');
    expect(e.items).toHaveLength(1);
    expect(e.items[0].direction).toBe('OUT');
    expect(e.items[0].qty).toBe(3);
    expect(e.items[0].reason).toBe('DAMAGED');
  });

  it('should default adjustmentDate and notes to null when absent', () => {
    const e = new CreateStockAdjustment({ outletId: 'o1', items: [validItem] });
    expect(e.adjustmentDate).toBeNull();
    expect(e.notes).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when outletId missing', () => {
    expect(() => new CreateStockAdjustment({ ...validPayload, outletId: '' })).toThrow(
      'CREATE_STOCK_ADJUSTMENT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw ITEMS_REQUIRED when items empty', () => {
    expect(() => new CreateStockAdjustment({ ...validPayload, items: [] })).toThrow(
      'CREATE_STOCK_ADJUSTMENT.ITEMS_REQUIRED',
    );
  });

  it('should throw ITEMS_REQUIRED when items missing', () => {
    expect(() => new CreateStockAdjustment({ outletId: 'o1' })).toThrow(
      'CREATE_STOCK_ADJUSTMENT.ITEMS_REQUIRED',
    );
  });

  it('should throw ITEM_BATCH_REQUIRED when batchId missing', () => {
    expect(
      () => new CreateStockAdjustment({ ...validPayload, items: [{ ...validItem, batchId: '' }] }),
    ).toThrow('CREATE_STOCK_ADJUSTMENT.ITEM_BATCH_REQUIRED');
  });

  it('should throw ITEM_INVALID_DIRECTION for a bad direction', () => {
    expect(
      () => new CreateStockAdjustment({ ...validPayload, items: [{ ...validItem, direction: 'UP' }] }),
    ).toThrow('CREATE_STOCK_ADJUSTMENT.ITEM_INVALID_DIRECTION');
  });

  it('should throw ITEM_QTY_MUST_BE_POSITIVE for zero qty', () => {
    expect(
      () => new CreateStockAdjustment({ ...validPayload, items: [{ ...validItem, qty: 0 }] }),
    ).toThrow('CREATE_STOCK_ADJUSTMENT.ITEM_QTY_MUST_BE_POSITIVE');
  });

  it('should throw ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION for non-number qty', () => {
    expect(
      () =>
        new CreateStockAdjustment({
          ...validPayload,
          items: [{ ...validItem, qty: 'x' as unknown as number }],
        }),
    ).toThrow('CREATE_STOCK_ADJUSTMENT.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should throw ITEM_INVALID_REASON for an unknown reason', () => {
    expect(
      () => new CreateStockAdjustment({ ...validPayload, items: [{ ...validItem, reason: 'NOPE' }] }),
    ).toThrow('CREATE_STOCK_ADJUSTMENT.ITEM_INVALID_REASON');
  });
});
