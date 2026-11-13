/* eslint-disable camelcase */

/**
 * Migration: product_types
 *
 * Moves the static product-type enum into a reference table. `products.product_type`
 * keeps the human-readable code (so existing queries/filters stay valid) but now
 * references `product_types(code)` instead of a CHECK constraint.
 *
 * Default rows are inserted here so a migrated database always has usable values,
 * even before `npm run seed` is executed. run-seed re-upserts the same rows so name/
 * description/order changes can be rolled out without a new migration.
 */

const DEFAULT_PRODUCT_TYPES = [
  ['RAW_MATERIAL', 'Bahan Baku', 'Bahan yang dibeli dan diolah menjadi produk.', 10],
  ['FINISHED_GOODS', 'Barang Jadi', 'Produk jadi yang dijual atau diproduksi.', 20],
  ['SEMI_FINISHED', 'Setengah Jadi', 'Bahan setengah jadi yang dapat diproses lebih lanjut.', 30],
  ['PACKAGING', 'Kemasan', 'Kemasan eksternal seperti botol, dus, dan label.', 40],
  ['BEVERAGE', 'Minuman', 'Produk minuman yang dijual.', 50],
  ['OFFICE_SUPPLIES', 'Alat Tulis Kantor', 'Kebutuhan administrasi kantor.', 60],
  ['SPARE_PART', 'Suku Cadang', 'Suku cadang peralatan atau mesin.', 70],
  ['OPERATING_SUPPLIES', 'Bahan Habis Pakai', 'Bahan operasional habis pakai.', 80],
  ['MERCHANDISE', 'Merchandise', 'Barang dagangan non-produksi.', 90],
  ['ELECTRONIC', 'Elektronik', 'Perangkat atau perlengkapan elektronik.', 100],
];

exports.up = (pgm) => {
  pgm.createTable('product_types', {
    code: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    description: {
      type: 'VARCHAR(500)',
      notNull: false,
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

  const values = DEFAULT_PRODUCT_TYPES.map(
    ([code, name, description, sortOrder]) =>
      `('${code}', '${name}', '${description}', ${sortOrder}, TRUE)`,
  ).join(',\n      ');

  pgm.sql(`
    INSERT INTO product_types (code, name, description, sort_order, is_active)
    VALUES
      ${values}
    ON CONFLICT (code) DO NOTHING;
  `);

  pgm.addConstraint('products', 'products_product_type_fk', {
    foreignKeys: {
      columns: 'product_type',
      references: 'product_types(code)',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  });
  pgm.dropConstraint('products', 'products_product_type_check');

  pgm.createIndex('product_types', 'is_active');
  pgm.createIndex('product_types', 'sort_order');
};

exports.down = (pgm) => {
  pgm.dropConstraint('products', 'products_product_type_fk');
  pgm.addConstraint(
    'products',
    'products_product_type_check',
    "CHECK (product_type IN ('RAW_MATERIAL','FINISHED_GOODS','SEMI_FINISHED','PACKAGING','BEVERAGE','OFFICE_SUPPLIES','SPARE_PART','OPERATING_SUPPLIES','MERCHANDISE','ELECTRONIC'))",
  );
  pgm.dropTable('product_types');
};
