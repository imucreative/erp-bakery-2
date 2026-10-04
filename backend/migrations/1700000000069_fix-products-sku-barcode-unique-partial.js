/* eslint-disable camelcase */

/**
 * Migration: fix products SKU & barcode uniqueness
 *
 * The original migration (1700000000013) defined
 * `products_sku_company_unique` and `products_barcode_company_unique` as plain
 * `UNIQUE (sku, company_id)` / `UNIQUE (barcode, company_id)` constraints.
 * Because a plain constraint counts soft-deleted rows (`deleted_at IS NOT NULL`),
 * reusing a SKU or barcode after soft-deleting the owning product triggered a
 * Postgres duplicate-key error (500), even though the repository
 * (`skuExists` / `barcodeExists`) and use case only consider rows with
 * `deleted_at IS NULL`. This caused a DB-vs-application inconsistency.
 *
 * This migration mirrors the Payment Term fix (1700000000028): it replaces each
 * plain unique constraint with a PARTIAL UNIQUE INDEX that only applies to
 * active (non-deleted) rows. Soft-deleted SKUs/barcodes may then be reused,
 * while duplicate ACTIVE values are still rejected — consistent with the
 * application logic.
 *
 * Barcode is nullable. The barcode partial index also filters
 * `barcode IS NOT NULL` because the application only enforces barcode
 * uniqueness when a barcode value is supplied; this keeps multiple NULL
 * barcodes allowed (Postgres already treats NULLs as distinct) while enforcing
 * uniqueness only on active rows that actually carry a barcode.
 */
exports.up = (pgm) => {
  // --- SKU ---
  // Drop the plain unique constraint that also covers soft-deleted rows.
  pgm.dropConstraint('products', 'products_sku_company_unique');
  // Recreate uniqueness as a partial unique index over ACTIVE rows only.
  pgm.createIndex('products', ['sku', 'company_id'], {
    unique: true,
    name: 'products_sku_company_unique',
    where: 'deleted_at IS NULL',
  });

  // --- Barcode ---
  pgm.dropConstraint('products', 'products_barcode_company_unique');
  // Unique only for active rows that have a barcode; NULL barcodes stay distinct.
  pgm.createIndex('products', ['barcode', 'company_id'], {
    unique: true,
    name: 'products_barcode_company_unique',
    where: 'deleted_at IS NULL AND barcode IS NOT NULL',
  });
};

exports.down = (pgm) => {
  // --- Barcode ---
  pgm.dropIndex('products', ['barcode', 'company_id'], {
    name: 'products_barcode_company_unique',
  });
  pgm.addConstraint(
    'products',
    'products_barcode_company_unique',
    'UNIQUE (barcode, company_id)',
  );

  // --- SKU ---
  pgm.dropIndex('products', ['sku', 'company_id'], {
    name: 'products_sku_company_unique',
  });
  pgm.addConstraint(
    'products',
    'products_sku_company_unique',
    'UNIQUE (sku, company_id)',
  );
};
