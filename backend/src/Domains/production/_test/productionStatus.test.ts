import {
  PRODUCTION_STATUSES,
  isProductionStatus,
  canTransition,
  isTerminalStatus,
} from '../productionStatus';

describe('isProductionStatus', () => {
  it('should accept valid statuses', () => {
    for (const s of PRODUCTION_STATUSES) {
      expect(isProductionStatus(s)).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(isProductionStatus('DONE')).toBe(false);
    expect(isProductionStatus(1)).toBe(false);
    expect(isProductionStatus(null)).toBe(false);
  });
});

describe('canTransition', () => {
  it('should allow the happy path SCHEDULED -> ... -> COMPLETED', () => {
    expect(canTransition('SCHEDULED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'YIELD_COMPLETED')).toBe(true);
    expect(canTransition('YIELD_COMPLETED', 'QA_PASSED')).toBe(true);
    expect(canTransition('YIELD_COMPLETED', 'QA_FAILED')).toBe(true);
    expect(canTransition('QA_PASSED', 'COMPLETED')).toBe(true);
    expect(canTransition('QA_FAILED', 'COMPLETED')).toBe(true);
  });

  it('should allow SCHEDULED -> CANCELLED', () => {
    expect(canTransition('SCHEDULED', 'CANCELLED')).toBe(true);
  });

  it('should forbid skipping QA (YIELD_COMPLETED -> COMPLETED)', () => {
    expect(canTransition('YIELD_COMPLETED', 'COMPLETED')).toBe(false);
  });

  it('should forbid cancelling once in progress', () => {
    expect(canTransition('IN_PROGRESS', 'CANCELLED')).toBe(false);
  });

  it('should treat COMPLETED and CANCELLED as terminal', () => {
    expect(canTransition('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(canTransition('CANCELLED', 'SCHEDULED')).toBe(false);
    expect(isTerminalStatus('COMPLETED')).toBe(true);
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('SCHEDULED')).toBe(false);
  });
});
