/* eslint-disable camelcase */

/**
 * Migration: product_uom_conversions
 *
 * UOM Conversion — TAHAP 1 (fondasi: skema).
 *
 * Per-product alternate-unit conversion factors (model per-produk, doc 50 §4/§5).
 * The product's base unit is `products.uom_id` (implicit factor = 1, no row here).
 * Each row maps an ALTERNATE uom (e.g. "karung") to the base unit via
 * `factor_to_base`: 1 <alt uom> = factor_to_base <base unit>.
 *
 * ADITIF & OPT-IN: this table only STORES conversions. No GR / inventory /
 * recipe / production path reads it in T1 — behaviour is unchanged.
 *
 * Company-scoped (SaaS tenant isolation). Follows the master-data convention of
 * existing masters (products/uoms): no created_by/updated_by columns (those
 * tables are not userId-aware), hard-delete via DELETE with `is_active` opt-out.
 *
 * FK choices mirror the products table:
 *   - product_id  → products  ON DELETE CASCADE  (conversions are child rows of a product)
 *   - uom_id      → uoms      ON DELETE RESTRICT  (shared master, protect from deletion)
 *   - company_id  → companies ON DELETE CASCADE   (tenant root)
 */
exports.up = (pgm) => {
  pgm.createTable('product_uom_conversions', {
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
    uom_id: {
      type: 'UUID',
      notNull: true,
      references: '"uoms"',
      onDelete: 'RESTRICT',
    },
    factor_to_base: {
      type: 'NUMERIC(18,6)',
      notNull: true,
    },
    is_active: {
      type: 'BOOLEAN',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // factor must be strictly positive (1 <alt uom> = factor_to_base <base>)
  pgm.addConstraint(
    'product_uom_conversions',
    'product_uom_conversions_factor_positive_check',
    'CHECK (factor_to_base > 0)',
  );

  // One factor per (product, alternate uom)
  pgm.addConstraint(
    'product_uom_conversions',
    'product_uom_conversions_product_uom_unique',
    'UNIQUE (product_id, uom_id)',
  );

  pgm.createIndex('product_uom_conversions', 'company_id');
  pgm.createIndex('product_uom_conversions', 'product_id');
};

exports.down = (pgm) => {
  pgm.dropTable('product_uom_conversions');
};
