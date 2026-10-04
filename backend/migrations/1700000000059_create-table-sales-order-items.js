/* eslint-disable camelcase */

/**
 * Migration: sales_order_items (POS / Sales Fase 2, doc 51 §4.4)
 *
 * One cart line = a sellable product + its selected toppings + qty.
 *
 * sale_mode is a SNAPSHOT of the resolved mode at checkout (§3.0) so the
 * backflush / stock-cut and refund stay reproducible even if the master data
 * (recipe / product type) changes afterwards:
 *   MADE_TO_ORDER -> recipe_id set (ACTIVE recipe used), backflush ingredients.
 *   STOCK         -> recipe_id NULL, cut finished-goods stock of the product.
 *
 * line_total = (unit_price_snapshot + toppings_price) * qty - item_discount.
 * toppings_price = 0 for STOCK (toppings are MADE_TO_ORDER only, §3.4).
 */
exports.up = (pgm) => {
  pgm.createTable('sales_order_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    sales_order_id: {
      type: 'UUID',
      notNull: true,
      references: '"sales_orders"',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    // Snapshot of the resolved sale mode (§3.0 / §4.4).
    sale_mode: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    // Snapshot of the ACTIVE recipe used (MADE_TO_ORDER only; NULL for STOCK).
    recipe_id: {
      type: 'UUID',
      notNull: false,
      references: '"recipes"',
      onDelete: 'RESTRICT',
    },
    product_name_snapshot: {
      type: 'VARCHAR(150)',
      notNull: true,
    },
    unit_price_snapshot: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    item_discount: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    toppings_price: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    line_total: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint('sales_order_items', 'sales_order_items_qty_positive', 'CHECK (qty > 0)');
  pgm.addConstraint(
    'sales_order_items',
    'sales_order_items_sale_mode_check',
    "CHECK (sale_mode IN ('MADE_TO_ORDER','STOCK'))",
  );

  pgm.createIndex('sales_order_items', 'sales_order_id');
  pgm.createIndex('sales_order_items', 'product_id');
  pgm.createIndex('sales_order_items', 'recipe_id');
};

exports.down = (pgm) => {
  pgm.dropTable('sales_order_items');
};
