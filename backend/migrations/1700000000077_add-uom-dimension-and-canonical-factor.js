/* eslint-disable camelcase */

/**
 * Migration: UOM dimension + canonical factor (doc 52, Opsi B2).
 *
 * Each UOM can describe its physical dimension and its ratio to the canonical
 * (smallest) unit of that dimension:
 *   1 <uom> = factor_to_canonical <canonical unit>
 *
 * Canonical units are gram (WEIGHT), milliliter (VOLUME), and pcs (COUNT).
 * Columns are nullable for legacy UOM rows; unknown packaging units are NOT
 * guessed and must be completed by an admin before global conversion can use
 * them. Known standard units are backfilled by code/name.
 */
exports.up = (pgm) => {
  pgm.addColumn('uoms', {
    dimension: {
      type: 'VARCHAR(20)',
      notNull: false,
    },
    factor_to_canonical: {
      type: 'NUMERIC(18,6)',
      notNull: false,
    },
  });

  pgm.addConstraint(
    'uoms',
    'uoms_dimension_check',
    "CHECK (dimension IS NULL OR dimension IN ('WEIGHT','VOLUME','COUNT'))",
  );
  pgm.addConstraint(
    'uoms',
    'uoms_factor_to_canonical_positive_check',
    'CHECK (factor_to_canonical IS NULL OR factor_to_canonical > 0)',
  );
  pgm.createIndex('uoms', 'dimension');

  const updates = [
    {
      dimension: 'WEIGHT',
      factor: 1,
      codes: ['G', 'GR', 'GRAM', 'GRAMS', 'GRAMM'],
      names: ['g', 'gr', 'gram', 'grams', 'gramm'],
    },
    {
      dimension: 'WEIGHT',
      factor: 1000,
      codes: ['KG', 'KGS', 'KILO', 'KILOGRAM', 'KILOGRAMS'],
      names: ['kg', 'kgs', 'kilo', 'kilogram', 'kilograms'],
    },
    {
      dimension: 'WEIGHT',
      factor: 1000000,
      codes: ['TON', 'TONS', 'TONNE', 'TONNES'],
      names: ['ton', 'tons', 'tonne', 'tonnes'],
    },
    {
      dimension: 'VOLUME',
      factor: 1,
      codes: ['ML', 'MILLILITER', 'MILLILITERS', 'MILLILITRE', 'MILLILITRES'],
      names: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
    },
    {
      dimension: 'VOLUME',
      factor: 1000,
      codes: ['L', 'LT', 'LTR', 'LITER', 'LITERS', 'LITRE', 'LITRES'],
      names: ['l', 'lt', 'ltr', 'liter', 'liters', 'litre', 'litres'],
    },
    {
      dimension: 'COUNT',
      factor: 1,
      codes: ['PCS', 'PC', 'PIECE', 'PIECES', 'UNIT', 'UNITS', 'EA', 'EACH'],
      names: ['pcs', 'pc', 'piece', 'pieces', 'unit', 'units', 'ea', 'each'],
    },
    {
      dimension: 'COUNT',
      factor: 12,
      codes: ['LUSIN', 'LUSINS', 'DOZEN', 'DOZENS'],
      names: ['lusin', 'lusins', 'dozen', 'dozens'],
    },
  ];

  for (const row of updates) {
    const codeList = row.codes.map((code) => `'${code}'`).join(',');
    const nameList = row.names.map((name) => `'${name}'`).join(',');
    pgm.sql(`
      UPDATE uoms
      SET dimension = '${row.dimension}', factor_to_canonical = ${row.factor}
      WHERE dimension IS NULL
        AND (
          UPPER(TRIM(code)) IN (${codeList})
          OR LOWER(TRIM(name)) IN (${nameList})
        );
    `);
  }
};

exports.down = (pgm) => {
  pgm.dropIndex('uoms', 'dimension');
  pgm.dropConstraint('uoms', 'uoms_factor_to_canonical_positive_check');
  pgm.dropConstraint('uoms', 'uoms_dimension_check');
  pgm.dropColumn('uoms', 'factor_to_canonical');
  pgm.dropColumn('uoms', 'dimension');
};
