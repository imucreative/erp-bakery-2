/* eslint-disable camelcase */

/**
 * Migration: sales_return_items (POS / Sales Fase 3 refund, doc 51 §4.8 / §8)
 *
 * One row per sales_order_item refunded. For the MVP full-order refund, every
 * order item is refunded in full: qty_returned = the item qty, and
 * refund_line_amount = the item line_total. The link back to the original batch
 * for the stock reversal is carried by the SALE_RETURN movement source key +
 * the sales_consumptions snapshot (doc 51 §8).
 */
exports.up = (pgm) => {
  pgm.createTable('sales_return_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    sales_return_id: {
      type: 'UUID',
      notNull: true,
      references: '"sales_returns"',
      onDelete: 'CASCADE',
    },
    sales_order_item_id: {
      type: 'UUID',
      notNull: true,
      references: '"sales_order_items"',
      onDelete: 'RESTRICT',
    },
    qty_returned: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    refund_line_amount: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'sales_return_items',
    'sales_return_items_qty_positive',
    'CHECK (qty_returned > 0)',
  );
  pgm.addConstraint(
    'sales_return_items',
    'sales_return_items_refund_non_negative',
    'CHECK (refund_line_amount >= 0)',
  );

  pgm.createIndex('sales_return_items', 'sales_return_id');
  pgm.createIndex('sales_return_items', 'sales_order_item_id');
};

exports.down = (pgm) => {
  pgm.dropTable('sales_return_items');
};
