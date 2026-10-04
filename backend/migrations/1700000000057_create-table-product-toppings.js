/* eslint-disable camelcase */

/**
 * Migration: product_toppings (POS / Sales — Fase 2, doc 51 §5 Opsi C)
 *
 * Allowed-topping join (Opsi C): a sellable product (product_id) links the
 * Product-toppings (topping_product_id — a RAW_MATERIAL / SEMI_FINISHED stock
 * product) that may be chosen for it at POS. Per-product extra price + default
 * consumption qty (doc 51 §3.5, OQ-2) live on the join row.
 *
 * Toppings only apply to MADE_TO_ORDER sellable products (§3.4). The sale-time
 * backflush consumes default_qty_per_item * item.qty of the topping product
 * (in the topping product's master UOM).
 *
 * Company-scoped (doc 35 §3.1). Minimal audit (created_at only — this is a
 * configuration join, not a transactional document).
 */
exports.up = (pgm) => {
  pgm.createTable('product_toppings', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'UUID',
      notNull: true,
      references: '"companies"',
      onDelete: 'CASCADE',
    },
    // Sellable product the topping is offered on.
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'CASCADE',
    },
    // The topping itself — a stock Product (RAW_MATERIAL / SEMI_FINISHED).
    topping_product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    // Default consumption qty per sold item, in the topping product's UOM (§3.5).
    default_qty_per_item: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 1,
    },
    // Extra price added to the item line when the topping is selected (may be 0).
    extra_price: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    sort_order: {
      type: 'INTEGER',
      notNull: true,
      default: 0,
    },
    is_active: {
      type: 'BOOLEAN',
      notNull: true,
      default: true,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'product_toppings',
    'product_toppings_qty_positive',
    'CHECK (default_qty_per_item > 0)',
  );
  pgm.addConstraint(
    'product_toppings',
    'product_toppings_extra_price_non_negative',
    'CHECK (extra_price >= 0)',
  );
  // A topping appears at most once per sellable product.
  pgm.addConstraint(
    'product_toppings',
    'product_toppings_product_topping_unique',
    'UNIQUE (product_id, topping_product_id)',
  );

  pgm.createIndex('product_toppings', 'company_id');
  pgm.createIndex('product_toppings', 'product_id');
  pgm.createIndex('product_toppings', 'topping_product_id');
};

exports.down = (pgm) => {
  pgm.dropTable('product_toppings');
};
