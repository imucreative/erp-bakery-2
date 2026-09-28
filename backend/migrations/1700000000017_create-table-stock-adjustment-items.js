/* eslint-disable camelcase */

/**
 * Migration: stock_adjustment_items (lines)
 *
 * Each line targets an exact existing inventory_batches row (rule #21 — MVP
 * adjustment operates only on existing batches, never implicitly creates one).
 *
 * `direction` is IN (increase) or OUT (decrease). `qty` is a positive magnitude.
 * `before_qty` / `after_qty` are authoritative snapshots persisted ONLY on
 * completion (rule #20) — derived by the backend from the reloaded batch, never
 * trusted from the frontend.
 */
exports.up = (pgm) => {
  pgm.createTable('stock_adjustment_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    stock_adjustment_id: {
      type: 'UUID',
      notNull: true,
      references: '"stock_adjustments"',
      onDelete: 'CASCADE',
    },
    batch_id: {
      type: 'UUID',
      notNull: true,
      references: '"inventory_batches"',
      onDelete: 'RESTRICT',
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    direction: {
      type: 'VARCHAR(3)',
      notNull: true,
      comment: 'IN or OUT',
    },
    qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      comment: 'Positive magnitude to adjust',
    },
    reason: {
      type: 'VARCHAR(30)',
      notNull: true,
      comment: 'Mandatory reason code (rule: reason codes mandatory)',
    },
    reason_description: {
      type: 'TEXT',
      notNull: false,
    },
    // Authoritative snapshots — filled only on completion (rule #20)
    before_qty: {
      type: 'NUMERIC(18,3)',
      notNull: false,
    },
    after_qty: {
      type: 'NUMERIC(18,3)',
      notNull: false,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint(
    'stock_adjustment_items',
    'stock_adjustment_items_direction_check',
    "CHECK (direction IN ('IN','OUT'))",
  );

  pgm.addConstraint(
    'stock_adjustment_items',
    'stock_adjustment_items_qty_positive',
    'CHECK (qty > 0)',
  );

  pgm.addConstraint(
    'stock_adjustment_items',
    'stock_adjustment_items_reason_check',
    "CHECK (reason IN ('STOCK_COUNT','DAMAGED','EXPIRED','LOST','FOUND','CORRECTION','OTHER'))",
  );

  pgm.createIndex('stock_adjustment_items', 'stock_adjustment_id');
  pgm.createIndex('stock_adjustment_items', 'batch_id');
  pgm.createIndex('stock_adjustment_items', 'product_id');
};

exports.down = (pgm) => {
  pgm.dropTable('stock_adjustment_items');
};
