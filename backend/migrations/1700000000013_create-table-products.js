/* eslint-disable camelcase */

/**
 * Migration: products
 * Core product master data. References product group, category, uom, supplier.
 * SKU unique per company; barcode unique per company (nullable).
 * product_type constrained to the ERP enum. Scoped per company, soft-deletable.
 */
exports.up = (pgm) => {
  pgm.createTable('products', {
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
    sku: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    barcode: {
      type: 'VARCHAR(50)',
      notNull: false,
    },
    name: {
      type: 'VARCHAR(150)',
      notNull: true,
    },
    product_group_id: {
      type: 'UUID',
      notNull: true,
      references: '"product_groups"',
      onDelete: 'RESTRICT',
    },
    category_id: {
      type: 'UUID',
      notNull: true,
      references: '"product_categories"',
      onDelete: 'RESTRICT',
    },
    uom_id: {
      type: 'UUID',
      notNull: true,
      references: '"uoms"',
      onDelete: 'RESTRICT',
    },
    supplier_id: {
      type: 'UUID',
      notNull: true,
      references: '"suppliers"',
      onDelete: 'RESTRICT',
    },
    product_type: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    purchase_price: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    selling_price: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    minimum_stock: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    shelf_life_days: {
      type: 'INTEGER',
      notNull: true,
      default: 0,
    },
    is_batch_tracked: {
      type: 'BOOLEAN',
      notNull: true,
      default: true,
    },
    is_active: {
      type: 'BOOLEAN',
      notNull: true,
      default: true,
    },
    deleted_at: {
      type: 'TIMESTAMP',
      notNull: false,
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

  // SKU unique per company
  pgm.addConstraint('products', 'products_sku_company_unique', 'UNIQUE (sku, company_id)');
  // Barcode unique per company (NULLs are distinct, so multiple nulls allowed)
  pgm.addConstraint(
    'products',
    'products_barcode_company_unique',
    'UNIQUE (barcode, company_id)',
  );
  // product_type enum
  pgm.addConstraint(
    'products',
    'products_product_type_check',
    "CHECK (product_type IN ('RAW_MATERIAL','FINISHED_GOODS','SEMI_FINISHED','PACKAGING','BEVERAGE','OFFICE_SUPPLIES','SPARE_PART','OPERATING_SUPPLIES','MERCHANDISE','ELECTRONIC'))",
  );

  pgm.createIndex('products', 'company_id');
  pgm.createIndex('products', 'sku');
  pgm.createIndex('products', 'product_group_id');
  pgm.createIndex('products', 'category_id');
  pgm.createIndex('products', 'uom_id');
  pgm.createIndex('products', 'supplier_id');
  pgm.createIndex('products', 'product_type');
  pgm.createIndex('products', 'is_active');
  pgm.createIndex('products', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('products');
};
