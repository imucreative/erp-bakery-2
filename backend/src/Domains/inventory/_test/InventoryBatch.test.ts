import { InventoryBatch, normalizeLotKey } from '../entities/InventoryBatch';

describe('normalizeLotKey', () => {
  it('should return empty string for null', () => {
    expect(normalizeLotKey(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(normalizeLotKey(undefined)).toBe('');
  });

  it('should trim whitespace', () => {
    expect(normalizeLotKey('  LOT-1  ')).toBe('LOT-1');
  });

  it('should return empty string for whitespace-only', () => {
    expect(normalizeLotKey('   ')).toBe('');
  });

  it('should preserve case', () => {
    expect(normalizeLotKey('Lot-AbC')).toBe('Lot-AbC');
  });
});

describe('InventoryBatch', () => {
  const base = {
    id: 'batch-uuid',
    companyId: 'company-uuid',
    outletId: 'outlet-uuid',
    productId: 'product-uuid',
    batchNumber: 'B-001',
    lotKey: '',
    expiredDate: new Date('2026-12-31'),
    qtyAvailable: 10,
    status: 'ACTIVE' as const,
  };

  it('should create batch with all properties', () => {
    const batch = new InventoryBatch({ ...base, lotNumber: 'L1', isNonBatch: false });

    expect(batch.id).toBe('batch-uuid');
    expect(batch.batchNumber).toBe('B-001');
    expect(batch.qtyAvailable).toBe(10);
    expect(batch.status).toBe('ACTIVE');
    expect(batch.isNonBatch).toBe(false);
  });

  it('should default lotKey to empty and isNonBatch to false', () => {
    const batch = new InventoryBatch({ ...base, lotKey: '' });

    expect(batch.lotKey).toBe('');
    expect(batch.isNonBatch).toBe(false);
    expect(batch.lotNumber).toBeNull();
  });

  it('should coerce qtyAvailable to number', () => {
    const batch = new InventoryBatch({ ...base, qtyAvailable: 5.5 as unknown as number });
    expect(typeof batch.qtyAvailable).toBe('number');
    expect(batch.qtyAvailable).toBe(5.5);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when id missing', () => {
    expect(() => new InventoryBatch({ ...base, id: '' })).toThrow(
      'INVENTORY_BATCH.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when outletId missing', () => {
    expect(() => new InventoryBatch({ ...base, outletId: '' })).toThrow(
      'INVENTORY_BATCH.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should allow expiredDate null (non-batch case)', () => {
    const batch = new InventoryBatch({ ...base, expiredDate: null, isNonBatch: true });
    expect(batch.expiredDate).toBeNull();
    expect(batch.isNonBatch).toBe(true);
  });
});
