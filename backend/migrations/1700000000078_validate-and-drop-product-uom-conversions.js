/* eslint-disable camelcase */

/**
 * Migration: validate then retire product_uom_conversions (doc 52).
 *
 * The per-product conversion table is superseded by the global B2 model on
 * `uoms` (dimension + factor_to_canonical). Before dropping it we verify that
 * every existing row agrees with the derived global factor. If any row cannot
 * be validated (missing UOM metadata, dimension mismatch, or factor conflict),
 * the migration ABORTS — we never guess physical dimensions.
 *
 * Run `npm run audit:uom` first and complete the UOM master data if it reports
 * issues. `goods_receipt_items.conversion_factor` is intentionally untouched:
 * historical GR snapshots remain valid.
 */
exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
      bad_count INTEGER;
      sample TEXT;
    BEGIN
      SELECT COUNT(*),
             string_agg(
               DISTINCT COALESCE(base.code, '?') || ' -> ' || COALESCE(alt.code, '?'),
               ', '
             )
        INTO bad_count, sample
        FROM product_uom_conversions c
        JOIN products p ON p.id = c.product_id
        LEFT JOIN uoms base ON base.id = p.uom_id
        LEFT JOIN uoms alt ON alt.id = c.uom_id
       WHERE base.id IS NULL
          OR alt.id IS NULL
          OR base.dimension IS NULL
          OR base.factor_to_canonical IS NULL
          OR alt.dimension IS NULL
          OR alt.factor_to_canonical IS NULL
          OR base.dimension <> alt.dimension
          OR ABS((alt.factor_to_canonical / base.factor_to_canonical) - c.factor_to_base) > 0.000001;

      IF bad_count > 0 THEN
        RAISE EXCEPTION
          'Cannot drop product_uom_conversions: % unresolved/conflicting row(s): %. Complete uoms.dimension/factor_to_canonical first.',
          bad_count, sample;
      END IF;
    END $$;
  `);

  pgm.dropTable('product_uom_conversions');
};

exports.down = (pgm) => {
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

  pgm.addConstraint(
    'product_uom_conversions',
    'product_uom_conversions_factor_positive_check',
    'CHECK (factor_to_base > 0)',
  );
  pgm.addConstraint(
    'product_uom_conversions',
    'product_uom_conversions_product_uom_unique',
    'UNIQUE (product_id, uom_id)',
  );
  pgm.createIndex('product_uom_conversions', 'company_id');
  pgm.createIndex('product_uom_conversions', 'product_id');
};
