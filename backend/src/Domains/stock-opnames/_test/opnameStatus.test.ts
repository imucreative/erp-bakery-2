import {
  OPNAME_STATUSES,
  isOpnameStatus,
  canTransition,
  OPNAME_LOCKING_STATUSES,
} from '../opnameStatus';

describe('isOpnameStatus', () => {
  it('should accept valid statuses', () => {
    for (const s of OPNAME_STATUSES) {
      expect(isOpnameStatus(s)).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(isOpnameStatus('OPEN')).toBe(false);
    expect(isOpnameStatus(3)).toBe(false);
    expect(isOpnameStatus(null)).toBe(false);
  });
});

describe('OPNAME_LOCKING_STATUSES', () => {
  it('should lock during COUNTING, SUBMITTED, APPROVED', () => {
    expect(OPNAME_LOCKING_STATUSES).toEqual(['COUNTING', 'SUBMITTED', 'APPROVED']);
  });
});

describe('canTransition', () => {
  it('should allow DRAFT -> COUNTING and DRAFT -> CANCELLED', () => {
    expect(canTransition('DRAFT', 'COUNTING')).toBe(true);
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('should allow COUNTING -> SUBMITTED and COUNTING -> CANCELLED', () => {
    expect(canTransition('COUNTING', 'SUBMITTED')).toBe(true);
    expect(canTransition('COUNTING', 'CANCELLED')).toBe(true);
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
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(false);
    expect(canTransition('COUNTING', 'APPROVED')).toBe(false);
    expect(canTransition('SUBMITTED', 'COMPLETED')).toBe(false);
  });

  it('should treat COMPLETED and CANCELLED as terminal', () => {
    expect(canTransition('COMPLETED', 'DRAFT')).toBe(false);
    expect(canTransition('CANCELLED', 'DRAFT')).toBe(false);
  });
});
