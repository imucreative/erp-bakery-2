/* eslint-disable camelcase */

/**
 * Migration: DROP product_toppings (POS / Sales Fase 6a, doc 51 §5.1)
 *
 * The per-product topping model (Opsi C — migrasi 057) is RETIRED in favour of
 * the GLOBAL topping catalog (`toppings`, migrasi 066) + products.has_toppings
 * (migrasi 067). Per doc 51 §5.1 the fresh/MVP recommendation is to DROP the
 * per-product join: the feature was never finished and carries no meaningful
 * production data, and product_toppings vs toppings have a different grain
 * (per-product vs global), so repurposing would leave an orphan product_id
 * column. DROP + fresh master is the cleanest path (no technical debt).
 *
 * `down` recreates product_toppings EXACTLY as migrasi 057 defined it so this
 * migration is fully reversible. Migrasi 057 is left untouched (append-only).
 */
exports.up = (pgm) => {
  pgm.dropTable('product_toppings');
};

exports.down = (pgm) => {
  // Recreate product_toppings identical to migrasi 057 (reversibility).
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
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'CASCADE',
    },
    topping_product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    default_qty_per_item: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 1,
    },
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
  pgm.addConstraint(
    'product_toppings',
    'product_toppings_product_topping_unique',
    'UNIQUE (product_id, topping_product_id)',
  );

  pgm.createIndex('product_toppings', 'company_id');
  pgm.createIndex('product_toppings', 'product_id');
  pgm.createIndex('product_toppings', 'topping_product_id');
};
