/* eslint-disable camelcase */

/**
 * Migration: stock_transfer_items (lines)
 *
 * Each line references an exact SOURCE inventory_batches row and snapshots its
 * batch/lot/expiry identity (rule #18) so the destination batch can be resolved
 * (or created) with the same identity on receive.
 *
 * `destination_batch_id` is filled on receive (IN_TRANSIT -> COMPLETED).
 * For MVP transferQty = dispatchQty = receiveQty (rule #17).
 */
exports.up = (pgm) => {
  pgm.createTable('stock_transfer_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    stock_transfer_id: {
      type: 'UUID',
      notNull: true,
      references: '"stock_transfers"',
      onDelete: 'CASCADE',
    },
    source_batch_id: {
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
    qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    // Batch identity snapshot from the source batch (rule #18)
    batch_number: { type: 'VARCHAR(60)', notNull: true },
    lot_key: { type: 'VARCHAR(60)', notNull: true, default: '' },
    lot_number: { type: 'VARCHAR(60)', notNull: false },
    expired_date: { type: 'DATE', notNull: false },
    // Resolved/created on receive
    destination_batch_id: {
      type: 'UUID',
      notNull: false,
      references: '"inventory_batches"',
      onDelete: 'RESTRICT',
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'stock_transfer_items',
    'stock_transfer_items_qty_positive',
    'CHECK (qty > 0)',
  );

  pgm.createIndex('stock_transfer_items', 'stock_transfer_id');
  pgm.createIndex('stock_transfer_items', 'source_batch_id');
  pgm.createIndex('stock_transfer_items', 'product_id');
  pgm.createIndex('stock_transfer_items', 'destination_batch_id');
};

exports.down = (pgm) => {
  pgm.dropTable('stock_transfer_items');
};
