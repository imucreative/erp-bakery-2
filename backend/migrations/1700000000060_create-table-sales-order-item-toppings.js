/* eslint-disable camelcase */

/**
 * Migration: sales_order_item_toppings (POS / Sales Fase 2, doc 51 §4.5)
 *
 * Selected modifiers attached to a sales order item (keputusan #2 — topping
 * menempel pada item, bukan baris cart terpisah). Only MADE_TO_ORDER items may
 * carry toppings (§3.4).
 *
 * qty_per_item + extra_price_snapshot are snapshots taken from the
 * product_toppings join at checkout (anti-tamper #5). qty_per_item is in the
 * topping product's master UOM and drives the sale-time backflush
 * (consumed = qty_per_item * item.qty).
 */
exports.up = (pgm) => {
  pgm.createTable('sales_order_item_toppings', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    sales_order_item_id: {
      type: 'UUID',
      notNull: true,
      references: '"sales_order_items"',
      onDelete: 'CASCADE',
    },
    topping_product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    topping_name_snapshot: {
      type: 'VARCHAR(150)',
      notNull: true,
    },
    // Consumption per sold item (snapshot of product_toppings.default_qty_per_item).
    qty_per_item: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 1,
    },
    // Extra price added to the item line (snapshot of product_toppings.extra_price).
    extra_price_snapshot: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'sales_order_item_toppings',
    'sales_order_item_toppings_qty_positive',
    'CHECK (qty_per_item > 0)',
  );

  pgm.createIndex('sales_order_item_toppings', 'sales_order_item_id');
  pgm.createIndex('sales_order_item_toppings', 'topping_product_id');
};

exports.down = (pgm) => {
  pgm.dropTable('sales_order_item_toppings');
};
