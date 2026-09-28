import {
  MOVEMENT_TYPES,
  isMovementType,
  isInboundMovement,
  isOutboundMovement,
} from '../movementTypes';

describe('isMovementType', () => {
  it('should accept all defined movement types', () => {
    for (const t of MOVEMENT_TYPES) {
      expect(isMovementType(t)).toBe(true);
    }
  });

  it('should reject unknown values', () => {
    expect(isMovementType('FOO')).toBe(false);
    expect(isMovementType(42)).toBe(false);
    expect(isMovementType(undefined)).toBe(false);
  });
});

describe('isInboundMovement / isOutboundMovement', () => {
  it('should classify inbound types correctly', () => {
    expect(isInboundMovement('PURCHASE')).toBe(true);
    expect(isInboundMovement('PRODUCTION_RESULT')).toBe(true);
    expect(isInboundMovement('TRANSFER_IN')).toBe(true);
    expect(isInboundMovement('ADJUSTMENT_IN')).toBe(true);
  });

  it('should classify outbound types correctly', () => {
    expect(isOutboundMovement('SALE')).toBe(true);
    expect(isOutboundMovement('TRANSFER_OUT')).toBe(true);
    expect(isOutboundMovement('ADJUSTMENT_OUT')).toBe(true);
    expect(isOutboundMovement('PRODUCTION_CONSUME')).toBe(true);
    expect(isOutboundMovement('EXPIRED')).toBe(true);
  });

  it('inbound types are not outbound and vice versa', () => {
    expect(isOutboundMovement('PURCHASE')).toBe(false);
    expect(isInboundMovement('SALE')).toBe(false);
  });
});
