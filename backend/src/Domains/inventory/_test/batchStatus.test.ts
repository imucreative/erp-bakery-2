import {
  BATCH_STATUSES,
  isBatchStatus,
  classifyExpiry,
  deriveOperationalStatus,
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

  // PostgreSQL DATE columns are read as UTC-midnight instants by BATCH_COLUMNS.
  const calendarDate = (date: string) => new Date(`${date}T00:00:00Z`);

  describe('WIB business day', () => {
    it.each([
      ['2026-10-27T16:59:59.999Z', '2026-10-27'],
      ['2026-10-27T17:00:00.000Z', '2026-10-28'],
    ])('uses the Jakarta date %j as the business date', (instant, expectedDate) => {
      expect(classifyExpiry(calendarDate(expectedDate), new Date(instant))).toBe('EXPIRING_SOON');
    });

    it('reports a batch expired once its Jakarta day has passed', () => {
      // 2026-10-27T17:00Z is already 2026-10-28 in WIB.
      expect(classifyExpiry(calendarDate('2026-10-27'), new Date('2026-10-27T17:30:00Z'))).toBe(
        'EXPIRED',
      );
      expect(classifyExpiry(calendarDate('2026-10-28'), new Date('2026-10-28T17:00:00Z'))).toBe(
        'EXPIRED',
      );
    });

    it('keeps the expiry day itself usable', () => {
      expect(classifyExpiry(calendarDate('2026-10-28'), new Date('2026-10-27T17:00:00Z'))).toBe(
        'EXPIRING_SOON',
      );
    });

    it('returns OK for a far-future expiry on a rolled-over business day', () => {
      expect(classifyExpiry(calendarDate('2026-12-31'), new Date('2026-10-27T17:00:00Z'))).toBe(
        'OK',
      );
    });
  });
});

describe('deriveOperationalStatus', () => {
  it('reads an ACTIVE batch past its expiry as EXPIRED', () => {
    expect(deriveOperationalStatus('ACTIVE', 'EXPIRED')).toBe('EXPIRED');
  });

  it.each(['EXPIRING_SOON', 'OK', 'NOT_APPLICABLE'] as const)(
    'keeps ACTIVE usable while %s',
    (expiryState) => {
      expect(deriveOperationalStatus('ACTIVE', expiryState)).toBe('ACTIVE');
    },
  );

  it.each(['EXPIRED', 'EXPIRING_SOON', 'OK', 'NOT_APPLICABLE'] as const)(
    'never rewrites QUARANTINE or CONSUMED by calendar (%s)',
    (expiryState) => {
      expect(deriveOperationalStatus('QUARANTINE', expiryState)).toBe('QUARANTINE');
      expect(deriveOperationalStatus('CONSUMED', expiryState)).toBe('CONSUMED');
    },
  );

  it('keeps a stored EXPIRED batch expired even before its date', () => {
    expect(deriveOperationalStatus('EXPIRED', 'OK')).toBe('EXPIRED');
  });
});
