/* eslint-disable camelcase */

/**
 * Migration: stock_opname_items (lines)
 *
 * One line per counted batch. `system_qty` is the frozen snapshot captured at
 * DRAFT -> COUNTING (rule #24). `counted_qty` is the physical count entered by
 * staff. `difference_qty` = counted_qty - system_qty (positive => surplus/IN,
 * negative => shortage/OUT), used to generate the reconciling adjustment.
 */
exports.up = (pgm) => {
  pgm.createTable('stock_opname_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    stock_opname_id: {
      type: 'UUID',
      notNull: true,
      references: '"stock_opnames"',
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
    system_qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      comment: 'Frozen snapshot of qty_available at COUNTING start',
    },
    counted_qty: {
      type: 'NUMERIC(18,3)',
      notNull: false,
      comment: 'Physical count; null until recorded',
    },
    difference_qty: {
      type: 'NUMERIC(18,3)',
      notNull: false,
      comment: 'counted_qty - system_qty; computed when counted',
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'stock_opname_items',
    'stock_opname_items_counted_non_negative',
    'CHECK (counted_qty IS NULL OR counted_qty >= 0)',
  );

  pgm.addConstraint(
    'stock_opname_items',
    'stock_opname_items_opname_batch_unique',
    'UNIQUE (stock_opname_id, batch_id)',
  );

  pgm.createIndex('stock_opname_items', 'stock_opname_id');
  pgm.createIndex('stock_opname_items', 'batch_id');
  pgm.createIndex('stock_opname_items', 'product_id');
};

exports.down = (pgm) => {
  pgm.dropTable('stock_opname_items');
};
