/* eslint-disable camelcase */

/**
 * Migration: toppings (GLOBAL topping catalog — POS / Sales Fase 6a, doc 51 §4.5a/§5.0)
 *
 * Replaces the per-product topping join (product_toppings, migrasi 057) with a
 * single GLOBAL topping catalog per company. One row = one topping product that
 * is available at POS. Consumption qty + extra price now live on the global
 * entry (no longer per-product). Products opt in via the boolean flag
 * products.has_toppings (migrasi 067): a has_toppings product in MADE_TO_ORDER
 * mode shows ALL active global toppings (§2.1, §3.4).
 *
 * The topping itself is a stock Product (RAW_MATERIAL / SEMI_FINISHED) so its
 * stock is tracked (keputusan #3). A topping product appears at most ONCE per
 * company — UNIQUE(company_id, topping_product_id).
 *
 * Company-scoped (doc 35 §3.1). Full audit fields (doc 35 §4) — this is master
 * data managed via CRUD.
 */
exports.up = (pgm) => {
  pgm.createTable('toppings', {
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
    // Audit fields (doc 35 §4)
    created_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    updated_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    deleted_at: { type: 'TIMESTAMP', notNull: false },
    deleted_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint('toppings', 'toppings_qty_positive', 'CHECK (default_qty_per_item > 0)');
  pgm.addConstraint(
    'toppings',
    'toppings_extra_price_non_negative',
    'CHECK (extra_price >= 0)',
  );
  // A topping product appears at most once per company (global catalog).
  pgm.addConstraint(
    'toppings',
    'toppings_company_topping_unique',
    'UNIQUE (company_id, topping_product_id)',
  );

  pgm.createIndex('toppings', 'company_id');
  pgm.createIndex('toppings', 'topping_product_id');
  pgm.createIndex('toppings', 'is_active');
};

exports.down = (pgm) => {
  pgm.dropTable('toppings');
};
