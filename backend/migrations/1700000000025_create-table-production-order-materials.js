/* eslint-disable camelcase */

/**
 * Migration: production_order_materials
 *
 * Immutable snapshot of the ingredients consumed by a production order when it
 * is COMPLETED (backflushing, production-domain rule #2). One row per
 * (ingredient product, source batch) allocation picked by FEFO.
 *
 * These rows are the auditable detail behind each PRODUCTION_CONSUME movement.
 * The planned quantity is captured for reconciliation against the actual
 * FEFO-allocated quantity.
 */
exports.up = (pgm) => {
  pgm.createTable('production_order_materials', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    production_order_id: {
      type: 'UUID',
      notNull: true,
      references: '"production_orders"',
      onDelete: 'CASCADE',
    },
    // The recipe_item this consumption fulfils (for reconciliation)
    recipe_item_id: {
      type: 'UUID',
      notNull: false,
      references: '"recipe_items"',
      onDelete: 'SET NULL',
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    // Source batch the quantity was drawn from (FEFO pick)
    batch_id: {
      type: 'UUID',
      notNull: true,
      references: '"inventory_batches"',
      onDelete: 'RESTRICT',
    },
    // Scaled+loss-adjusted quantity required for this ingredient (informational)
    planned_qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
    },
    // Actual quantity consumed from this batch allocation
    qty_consumed: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'production_order_materials',
    'production_order_materials_qty_positive',
    'CHECK (qty_consumed > 0)',
  );

  pgm.createIndex('production_order_materials', 'production_order_id');
  pgm.createIndex('production_order_materials', 'product_id');
  pgm.createIndex('production_order_materials', 'batch_id');
};

exports.down = (pgm) => {
  pgm.dropTable('production_order_materials');
};
