/* eslint-disable camelcase */

/**
 * Migration: purchase_order_items (lines)
 *
 * Each line orders a product with an agreed unit price and a percentage tax.
 * All money fields are computed server-side (anti-tamper, doc 26 §6):
 *   subtotal   = quantity * unit_price
 *   tax_amount = subtotal * tax_percent / 100
 *   total      = subtotal + tax_amount
 *
 * ON DELETE CASCADE with the header so a hard-deleted header (should it ever
 * happen in tests) cleans its lines; normal flow soft-deletes the header.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_order_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    purchase_order_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_orders"',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    quantity: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    uom_id: {
      type: 'UUID',
      notNull: true,
      references: '"uoms"',
      onDelete: 'RESTRICT',
    },
    unit_price: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    tax_percent: {
      type: 'NUMERIC(7,4)',
      notNull: true,
      default: 0,
    },
    subtotal: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    tax_amount: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    total: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'purchase_order_items',
    'purchase_order_items_quantity_positive',
    'CHECK (quantity > 0)',
  );
  pgm.addConstraint(
    'purchase_order_items',
    'purchase_order_items_unit_price_non_negative',
    'CHECK (unit_price >= 0)',
  );
  pgm.addConstraint(
    'purchase_order_items',
    'purchase_order_items_tax_percent_non_negative',
    'CHECK (tax_percent >= 0)',
  );

  pgm.createIndex('purchase_order_items', 'purchase_order_id');
  pgm.createIndex('purchase_order_items', 'product_id');
  pgm.createIndex('purchase_order_items', 'uom_id');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_order_items');
};
