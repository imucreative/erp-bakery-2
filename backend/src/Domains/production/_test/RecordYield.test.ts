import { RecordYield } from '../entities/RecordYield';

const base = {
  actualQty: 38,
  wasteQty: 2,
  resultExpiredDate: '2026-10-05',
};

describe('RecordYield', () => {
  it('should construct with a valid payload', () => {
    const y = new RecordYield(base);
    expect(y.actualQty).toBe(38);
    expect(y.wasteQty).toBe(2);
    expect(y.resultExpiredDate).toBe('2026-10-05');
  });

  it('should default wasteQty to 0 when omitted', () => {
    const y = new RecordYield({ actualQty: 10, resultExpiredDate: '2026-10-05' });
    expect(y.wasteQty).toBe(0);
  });

  it('should reject non-numeric actualQty', () => {
    expect(
      () => new RecordYield({ ...base, actualQty: 'x' as unknown as number }),
    ).toThrow('RECORD_YIELD.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should reject non-positive actualQty', () => {
    expect(() => new RecordYield({ ...base, actualQty: 0 })).toThrow(
      'RECORD_YIELD.QTY_MUST_BE_POSITIVE',
    );
  });

  it('should reject negative waste', () => {
    expect(() => new RecordYield({ ...base, wasteQty: -1 })).toThrow('RECORD_YIELD.WASTE_INVALID');
  });

  it('should require result expiry', () => {
    expect(() => new RecordYield({ actualQty: 10 })).toThrow(
      'RECORD_YIELD.RESULT_EXPIRY_REQUIRED',
    );
  });

  it('should reject an invalid expiry date', () => {
    expect(() => new RecordYield({ ...base, resultExpiredDate: 'not-a-date' })).toThrow(
      'RECORD_YIELD.RESULT_EXPIRY_INVALID',
    );
  });
});
