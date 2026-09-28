import {
  ADJUSTMENT_REASONS,
  isAdjustmentReason,
  isAdjustmentDirection,
} from '../adjustmentReason';

describe('isAdjustmentReason', () => {
  it('should accept all defined reasons', () => {
    for (const r of ADJUSTMENT_REASONS) {
      expect(isAdjustmentReason(r)).toBe(true);
    }
  });

  it('should reject unknown reasons', () => {
    expect(isAdjustmentReason('WHATEVER')).toBe(false);
    expect(isAdjustmentReason(0)).toBe(false);
  });
});

describe('isAdjustmentDirection', () => {
  it('should accept IN and OUT', () => {
    expect(isAdjustmentDirection('IN')).toBe(true);
    expect(isAdjustmentDirection('OUT')).toBe(true);
  });

  it('should reject anything else', () => {
    expect(isAdjustmentDirection('UP')).toBe(false);
    expect(isAdjustmentDirection('in')).toBe(false);
    expect(isAdjustmentDirection(null)).toBe(false);
  });
});
