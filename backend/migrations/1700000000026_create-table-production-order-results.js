/* eslint-disable camelcase */

/**
 * Migration: production_order_results
 *
 * Immutable snapshot of the finished-goods batch(es) produced when a
 * production order is COMPLETED after QA passes (production-domain rule #2).
 * Typically one row per order (the finished-goods InventoryBatch created via
 * PRODUCTION_RESULT), modelled as a table to allow multi-batch splits later.
 */
exports.up = (pgm) => {
  pgm.createTable('production_order_results', {
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
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    // The finished-goods InventoryBatch created for this result
    batch_id: {
      type: 'UUID',
      notNull: true,
      references: '"inventory_batches"',
      onDelete: 'RESTRICT',
    },
    batch_number: {
      type: 'VARCHAR(60)',
      notNull: true,
    },
    expired_date: {
      type: 'DATE',
      notNull: true,
    },
    qty_produced: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'production_order_results',
    'production_order_results_qty_positive',
    'CHECK (qty_produced > 0)',
  );

  pgm.createIndex('production_order_results', 'production_order_id');
  pgm.createIndex('production_order_results', 'product_id');
  pgm.createIndex('production_order_results', 'batch_id');
};

exports.down = (pgm) => {
  pgm.dropTable('production_order_results');
};
