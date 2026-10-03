import {
  PRODUCTION_STATUSES,
  isProductionStatus,
  isTerminalStatus,
} from '../productionStatus';

describe('productionStatus (instant-complete)', () => {
  describe('PRODUCTION_STATUSES', () => {
    it('should expose only COMPLETED', () => {
      expect(PRODUCTION_STATUSES).toEqual(['COMPLETED']);
    });
  });

  describe('isProductionStatus', () => {
    it('should accept COMPLETED', () => {
      expect(isProductionStatus('COMPLETED')).toBe(true);
    });

    it('should reject retired and invalid values', () => {
      expect(isProductionStatus('SCHEDULED')).toBe(false);
      expect(isProductionStatus('IN_PROGRESS')).toBe(false);
      expect(isProductionStatus('QA_PASSED')).toBe(false);
      expect(isProductionStatus('CANCELLED')).toBe(false);
      expect(isProductionStatus('DONE')).toBe(false);
      expect(isProductionStatus(1)).toBe(false);
      expect(isProductionStatus(null)).toBe(false);
    });
  });

  describe('isTerminalStatus', () => {
    it('should treat COMPLETED as terminal', () => {
      expect(isTerminalStatus('COMPLETED')).toBe(true);
    });
  });
});
