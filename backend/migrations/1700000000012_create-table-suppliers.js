/* eslint-disable camelcase */

/**
 * Migration: suppliers
 * Vendor / supplier master data. Scoped per company, soft-deletable.
 */
exports.up = (pgm) => {
  pgm.createTable('suppliers', {
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
    pic_name: {
      type: 'VARCHAR(100)',
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
  pgm.addConstraint('suppliers', 'suppliers_code_company_unique', 'UNIQUE (code, company_id)');

  pgm.createIndex('suppliers', 'company_id');
  pgm.createIndex('suppliers', 'code');
  pgm.createIndex('suppliers', 'is_active');
  pgm.createIndex('suppliers', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('suppliers');
};
