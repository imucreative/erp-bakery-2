/* eslint-disable camelcase */

/**
 * Migration: companies
 * SaaS multi-tenant root entity. Every data belongs to a company (tenant).
 */
exports.up = (pgm) => {
  pgm.createTable('companies', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    code: {
      type: 'VARCHAR(20)',
      notNull: true,
      unique: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    slug: {
      type: 'VARCHAR(100)',
      notNull: true,
      unique: true,
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

  pgm.createIndex('companies', 'slug');
  pgm.createIndex('companies', 'is_active');
  pgm.createIndex('companies', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('companies');
};
