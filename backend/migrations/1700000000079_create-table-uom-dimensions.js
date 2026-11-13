/* eslint-disable camelcase */

/**
 * Migration: uom_dimensions (dimensi sebagai data, lanjutan doc 52 B2).
 *
 * Sebelumnya dimensi adalah enum tertutup (WEIGHT/VOLUME/COUNT) dengan CHECK.
 * Sekarang dimensi disimpan sebagai referensi global sehingga admin bisa
 * menambah dimensi baru (mis. LENGTH) beserta satuan kanonik/terkecilnya.
 *
 * `uoms.dimension` tetap menyimpan kode dimensi (string) agar query lama dan
 * goods-receipt tidak berubah; integritasnya dijaga FK, bukan CHECK.
 */

const DEFAULT_DIMENSIONS = [
  ['WEIGHT', 'Berat', 'gram', 'g'],
  ['VOLUME', 'Volume', 'mililiter', 'ml'],
  ['COUNT', 'Hitungan', 'pcs', 'pcs'],
];

exports.up = (pgm) => {
  pgm.createTable('uom_dimensions', {
    code: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    canonical_unit_name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    canonical_unit_symbol: {
      type: 'VARCHAR(20)',
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

  const values = DEFAULT_DIMENSIONS.map(
    ([code, name, unitName, unitSymbol]) =>
      `('${code}', '${name}', '${unitName}', '${unitSymbol}', TRUE)`,
  ).join(',\n      ');

  pgm.sql(`
    INSERT INTO uom_dimensions
      (code, name, canonical_unit_name, canonical_unit_symbol, is_active)
    VALUES
      ${values}
    ON CONFLICT (code) DO NOTHING;
  `);

  pgm.dropConstraint('uoms', 'uoms_dimension_check');
  pgm.addConstraint('uoms', 'uoms_dimension_fk', {
    foreignKeys: {
      columns: 'dimension',
      references: 'uom_dimensions(code)',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('uoms', 'uoms_dimension_fk');
  pgm.addConstraint(
    'uoms',
    'uoms_dimension_check',
    "CHECK (dimension IS NULL OR dimension IN ('WEIGHT','VOLUME','COUNT'))",
  );
  pgm.dropTable('uom_dimensions');
};
