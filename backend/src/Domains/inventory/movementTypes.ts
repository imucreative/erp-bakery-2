/**
 * Inventory movement types — canonical ledger vocabulary.
 *
 * Executable posting types are used by services to mutate stock.
 * Legacy types (ADJUSTMENT, OPNAME) are retained for historical/diagnostic
 * rows only and MUST NOT be used for new executable posting
 * (inventory-domain rules #22 & #25).
 */
export const MOVEMENT_TYPES = [
  'PURCHASE',
  'PRODUCTION_CONSUME',
  'PRODUCTION_RESULT',
  'SALE',
  'RETURN',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'ADJUSTMENT', // legacy — diagnostic only
  'OPNAME', // legacy — diagnostic only
  'EXPIRED',
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

/**
 * Movement types that INCREASE stock (inbound).
 */
export const INBOUND_MOVEMENT_TYPES: readonly MovementType[] = [
  'PURCHASE',
  'PRODUCTION_RESULT',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
];

/**
 * Movement types that DECREASE stock (outbound).
 */
export const OUTBOUND_MOVEMENT_TYPES: readonly MovementType[] = [
  'PRODUCTION_CONSUME',
  'SALE',
  'RETURN',
  'TRANSFER_OUT',
  'ADJUSTMENT_OUT',
  'EXPIRED',
];

export function isMovementType(value: unknown): value is MovementType {
  return typeof value === 'string' && (MOVEMENT_TYPES as readonly string[]).includes(value);
}

export function isInboundMovement(type: MovementType): boolean {
  return INBOUND_MOVEMENT_TYPES.includes(type);
}

export function isOutboundMovement(type: MovementType): boolean {
  return OUTBOUND_MOVEMENT_TYPES.includes(type);
}
