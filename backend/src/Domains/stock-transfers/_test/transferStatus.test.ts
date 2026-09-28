import { TRANSFER_STATUSES, isTransferStatus, canTransition } from '../transferStatus';

describe('isTransferStatus', () => {
  it('should accept valid statuses', () => {
    for (const s of TRANSFER_STATUSES) {
      expect(isTransferStatus(s)).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(isTransferStatus('SHIPPED')).toBe(false);
    expect(isTransferStatus(2)).toBe(false);
    expect(isTransferStatus(null)).toBe(false);
  });
});

describe('canTransition', () => {
  it('should allow DRAFT -> SUBMITTED and DRAFT -> CANCELLED', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('should allow SUBMITTED -> IN_TRANSIT and SUBMITTED -> CANCELLED', () => {
    expect(canTransition('SUBMITTED', 'IN_TRANSIT')).toBe(true);
    expect(canTransition('SUBMITTED', 'CANCELLED')).toBe(true);
  });

  it('should allow IN_TRANSIT -> COMPLETED only', () => {
    expect(canTransition('IN_TRANSIT', 'COMPLETED')).toBe(true);
    expect(canTransition('IN_TRANSIT', 'CANCELLED')).toBe(false);
  });

  it('should forbid skipping states', () => {
    expect(canTransition('DRAFT', 'IN_TRANSIT')).toBe(false);
    expect(canTransition('DRAFT', 'COMPLETED')).toBe(false);
    expect(canTransition('SUBMITTED', 'COMPLETED')).toBe(false);
  });

  it('should treat COMPLETED and CANCELLED as terminal', () => {
    expect(canTransition('COMPLETED', 'DRAFT')).toBe(false);
    expect(canTransition('CANCELLED', 'DRAFT')).toBe(false);
  });
});
