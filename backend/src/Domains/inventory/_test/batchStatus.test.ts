import {
  BATCH_STATUSES,
  isBatchStatus,
  classifyExpiry,
  INVENTORY_EXPIRY_SOON_DAYS,
} from '../batchStatus';

describe('isBatchStatus', () => {
  it('should accept valid statuses', () => {
    for (const s of BATCH_STATUSES) {
      expect(isBatchStatus(s)).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(isBatchStatus('UNKNOWN')).toBe(false);
    expect(isBatchStatus(123)).toBe(false);
    expect(isBatchStatus(null)).toBe(false);
  });
});

describe('classifyExpiry', () => {
  const businessDate = new Date('2026-06-15T10:00:00Z');

  it('should return NOT_APPLICABLE for non-batch', () => {
    expect(classifyExpiry(new Date('2026-06-20'), businessDate, true)).toBe('NOT_APPLICABLE');
  });

  it('should return NOT_APPLICABLE when expiredDate is null', () => {
    expect(classifyExpiry(null, businessDate, false)).toBe('NOT_APPLICABLE');
  });

  it('should return EXPIRED when expiry is before business date', () => {
    expect(classifyExpiry(new Date('2026-06-14'), businessDate)).toBe('EXPIRED');
  });

  it('should return EXPIRING_SOON when expiry equals business date (same-day valid)', () => {
    expect(classifyExpiry(new Date('2026-06-15'), businessDate)).toBe('EXPIRING_SOON');
  });

  it('should return EXPIRING_SOON when within threshold days', () => {
    // 20 days ahead, threshold 30
    expect(classifyExpiry(new Date('2026-07-05'), businessDate)).toBe('EXPIRING_SOON');
  });

  it('should return EXPIRING_SOON exactly at threshold boundary', () => {
    const boundary = new Date(businessDate);
    boundary.setUTCDate(boundary.getUTCDate() + INVENTORY_EXPIRY_SOON_DAYS);
    expect(classifyExpiry(boundary, businessDate)).toBe('EXPIRING_SOON');
  });

  it('should return OK when beyond threshold', () => {
    const beyond = new Date(businessDate);
    beyond.setUTCDate(beyond.getUTCDate() + INVENTORY_EXPIRY_SOON_DAYS + 1);
    expect(classifyExpiry(beyond, businessDate)).toBe('OK');
  });
});
