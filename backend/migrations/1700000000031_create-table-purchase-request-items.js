/* eslint-disable camelcase */

/**
 * Migration: purchase_request_items (lines)
 *
 * Each line requests a product with an estimated unit price. `subtotal`
 * (= quantity * estimated_price) and the header `total_estimated_amount` are
 * computed server-side to prevent client tampering (doc 34 §2).
 *
 * ON DELETE CASCADE with the header so a hard-deleted header (should it ever
 * happen in tests) cleans its lines; normal flow soft-deletes the header.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_request_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    purchase_request_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_requests"',
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
    estimated_price: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    subtotal: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'purchase_request_items',
    'purchase_request_items_quantity_positive',
    'CHECK (quantity > 0)',
  );
  pgm.addConstraint(
    'purchase_request_items',
    'purchase_request_items_estimated_price_non_negative',
    'CHECK (estimated_price >= 0)',
  );

  pgm.createIndex('purchase_request_items', 'purchase_request_id');
  pgm.createIndex('purchase_request_items', 'product_id');
  pgm.createIndex('purchase_request_items', 'uom_id');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_request_items');
};
