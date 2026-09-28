import {
  ADJUSTMENT_STATUSES,
  isAdjustmentStatus,
  canTransition,
} from '../adjustmentStatus';

describe('isAdjustmentStatus', () => {
  it('should accept valid statuses', () => {
    for (const s of ADJUSTMENT_STATUSES) {
      expect(isAdjustmentStatus(s)).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(isAdjustmentStatus('PENDING')).toBe(false);
    expect(isAdjustmentStatus(1)).toBe(false);
    expect(isAdjustmentStatus(null)).toBe(false);
  });
});

describe('canTransition', () => {
  it('should allow DRAFT -> SUBMITTED and DRAFT -> CANCELLED', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('should allow SUBMITTED -> APPROVED and SUBMITTED -> CANCELLED', () => {
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
    expect(canTransition('SUBMITTED', 'CANCELLED')).toBe(true);
  });

  it('should allow APPROVED -> COMPLETED only', () => {
    expect(canTransition('APPROVED', 'COMPLETED')).toBe(true);
    expect(canTransition('APPROVED', 'CANCELLED')).toBe(false);
  });

  it('should forbid skipping states', () => {
    expect(canTransition('DRAFT', 'APPROVED')).toBe(false);
    expect(canTransition('DRAFT', 'COMPLETED')).toBe(false);
    expect(canTransition('SUBMITTED', 'COMPLETED')).toBe(false);
  });

  it('should treat COMPLETED and CANCELLED as terminal', () => {
    expect(canTransition('COMPLETED', 'DRAFT')).toBe(false);
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransition('CANCELLED', 'DRAFT')).toBe(false);
  });
});
