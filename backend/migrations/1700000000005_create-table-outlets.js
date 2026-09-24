/* eslint-disable camelcase */

/**
 * Migration: outlets
 * Physical bakery outlet locations. Scoped per company.
 */
exports.up = (pgm) => {
  pgm.createTable('outlets', {
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
    address: {
      type: 'TEXT',
      notNull: false,
    },
    phone: {
      type: 'VARCHAR(30)',
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
    'outlets',
    'outlets_code_company_unique',
    'UNIQUE (code, company_id)',
  );

  pgm.createIndex('outlets', 'company_id');
  pgm.createIndex('outlets', 'code');
  pgm.createIndex('outlets', 'is_active');
  pgm.createIndex('outlets', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('outlets');
};
