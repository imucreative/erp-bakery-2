/* eslint-disable camelcase */

/**
 * Migration: uoms
 * Units of measure (PCS, KG, GRAM, LITER, ...).
 * Scoped per company, soft-deletable.
 */
exports.up = (pgm) => {
  pgm.createTable('uoms', {
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
    code: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
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
  pgm.addConstraint('uoms', 'uoms_code_company_unique', 'UNIQUE (code, company_id)');

  pgm.createIndex('uoms', 'company_id');
  pgm.createIndex('uoms', 'code');
  pgm.createIndex('uoms', 'is_active');
  pgm.createIndex('uoms', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('uoms');
};
