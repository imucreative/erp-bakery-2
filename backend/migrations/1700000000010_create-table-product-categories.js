/* eslint-disable camelcase */

/**
 * Migration: product_categories
 * Second-level classification, child of a product group.
 * Scoped per company, soft-deletable.
 */
exports.up = (pgm) => {
  pgm.createTable('product_categories', {
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
    product_group_id: {
      type: 'UUID',
      notNull: true,
      references: '"product_groups"',
      onDelete: 'RESTRICT',
    },
    code: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    description: {
      type: 'TEXT',
      notNull: false,
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

  // code unique per company
  pgm.addConstraint(
    'product_categories',
    'product_categories_code_company_unique',
    'UNIQUE (code, company_id)',
  );

  pgm.createIndex('product_categories', 'company_id');
  pgm.createIndex('product_categories', 'product_group_id');
  pgm.createIndex('product_categories', 'code');
  pgm.createIndex('product_categories', 'is_active');
  pgm.createIndex('product_categories', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('product_categories');
};
