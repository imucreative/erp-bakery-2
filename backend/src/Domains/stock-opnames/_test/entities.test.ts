import { CreateStockOpname } from '../entities/CreateStockOpname';
import { RecordCount } from '../entities/RecordCount';

describe('CreateStockOpname', () => {
  it('should build entity with outletId and normalized fields', () => {
    const e = new CreateStockOpname({ outletId: 'o1', opnameDate: '2026-09-28', notes: 'cek' });
    expect(e.outletId).toBe('o1');
    expect(e.opnameDate).toBe('2026-09-28');
    expect(e.notes).toBe('cek');
  });

  it('should default date and notes to null', () => {
    const e = new CreateStockOpname({ outletId: 'o1' });
    expect(e.opnameDate).toBeNull();
    expect(e.notes).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when outletId missing', () => {
    expect(() => new CreateStockOpname({ outletId: '' })).toThrow(
      'CREATE_STOCK_OPNAME.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(() => new CreateStockOpname(null)).toThrow(
      'CREATE_STOCK_OPNAME.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});

describe('RecordCount', () => {
  it('should accept a non-negative counted quantity', () => {
    expect(new RecordCount({ countedQty: 0 }).countedQty).toBe(0);
    expect(new RecordCount({ countedQty: 12.5 }).countedQty).toBe(12.5);
  });

  it('should throw QTY_NOT_MEET_DATA_TYPE_SPECIFICATION for non-number', () => {
    expect(() => new RecordCount({ countedQty: 'x' })).toThrow(
      'RECORD_COUNT.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw QTY_MUST_BE_NON_NEGATIVE for negative', () => {
    expect(() => new RecordCount({ countedQty: -1 })).toThrow(
      'RECORD_COUNT.QTY_MUST_BE_NON_NEGATIVE',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY for null payload', () => {
    expect(() => new RecordCount(null)).toThrow('RECORD_COUNT.NOT_CONTAIN_NEEDED_PROPERTY');
  });
});
