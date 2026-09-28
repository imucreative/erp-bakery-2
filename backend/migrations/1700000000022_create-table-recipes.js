/* eslint-disable camelcase */

/**
 * Migration: recipes (Bill of Materials header)
 *
 * A recipe converts ingredients into a finished product (production-domain §3).
 * Lifecycle: DRAFT -> ACTIVE -> ARCHIVED (only one ACTIVE recipe per product).
 * Ingredient measurements scale linearly by production order qty (rule #1).
 */
exports.up = (pgm) => {
  pgm.createTable('recipes', {
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
    recipe_number: {
      type: 'VARCHAR(30)',
      notNull: true,
      comment: 'RCP-YYYY-NNNNNN',
    },
    name: {
      type: 'VARCHAR(150)',
      notNull: true,
    },
    // The finished product this recipe yields
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    version: {
      type: 'INTEGER',
      notNull: true,
      default: 1,
    },
    yield_qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      comment: 'Quantity of finished product produced by one batch',
    },
    yield_uom_id: {
      type: 'UUID',
      notNull: true,
      references: '"uoms"',
      onDelete: 'RESTRICT',
    },
    instructions: {
      type: 'TEXT',
      notNull: false,
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'DRAFT',
    },
    deleted_at: {
      type: 'TIMESTAMP',
      notNull: false,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'recipes',
    'recipes_number_company_unique',
    'UNIQUE (recipe_number, company_id)',
  );

  pgm.addConstraint(
    'recipes',
    'recipes_status_check',
    "CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED'))",
  );

  pgm.addConstraint('recipes', 'recipes_yield_positive', 'CHECK (yield_qty > 0)');

  // Enforce at most one ACTIVE recipe per product per company (rule: only one
  // active recipe per product). Partial unique index over ACTIVE rows only.
  pgm.sql(`
    CREATE UNIQUE INDEX recipes_one_active_per_product
    ON recipes (company_id, product_id)
    WHERE status = 'ACTIVE' AND deleted_at IS NULL
  `);

  pgm.createIndex('recipes', 'company_id');
  pgm.createIndex('recipes', 'product_id');
  pgm.createIndex('recipes', 'status');
  pgm.createIndex('recipes', 'recipe_number');
  pgm.createIndex('recipes', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('recipes');
};
