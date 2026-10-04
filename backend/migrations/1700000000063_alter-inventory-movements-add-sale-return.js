/* eslint-disable camelcase */

/**
 * Migration: add SALE_RETURN to the inventory_movements movement_type whitelist
 * (POS / Sales Fase 3 refund, doc 51 §8 / OQ-5).
 *
 * Refund returns the stock consumed by a PAID sales order back to its ORIGINAL
 * batch. The existing `RETURN` movement type is classified OUTBOUND (it is used
 * by Purchase Return to DECREASE stock) and therefore cannot represent an
 * inbound sales refund. A new INBOUND type `SALE_RETURN` is introduced for this
 * purpose (kept in sync with Domains/inventory/movementTypes.ts).
 *
 * This migration DROPs and RECREATEs the CHECK constraint
 * `inventory_movements_type_check` to ADD 'SALE_RETURN' to the allowed set,
 * preserving every existing type. `down` restores the constraint without
 * SALE_RETURN. No other movement type is removed.
 */
exports.up = (pgm) => {
  pgm.dropConstraint('inventory_movements', 'inventory_movements_type_check');
  pgm.addConstraint(
    'inventory_movements',
    'inventory_movements_type_check',
    `CHECK (movement_type IN (
      'PURCHASE','PRODUCTION_CONSUME','PRODUCTION_RESULT','SALE','RETURN',
      'SALE_RETURN','TRANSFER_OUT','TRANSFER_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT',
      'ADJUSTMENT','OPNAME','EXPIRED'
    ))`,
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('inventory_movements', 'inventory_movements_type_check');
  pgm.addConstraint(
    'inventory_movements',
    'inventory_movements_type_check',
    `CHECK (movement_type IN (
      'PURCHASE','PRODUCTION_CONSUME','PRODUCTION_RESULT','SALE','RETURN',
      'TRANSFER_OUT','TRANSFER_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT',
      'ADJUSTMENT','OPNAME','EXPIRED'
    ))`,
  );
};
