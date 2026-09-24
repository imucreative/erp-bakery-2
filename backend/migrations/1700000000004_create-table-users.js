/* eslint-disable camelcase */

/**
 * Migration: users
 * Platform user accounts. Scoped to a company via company_id.
 * SUPER_ADMIN users have NULL company_id (platform-level).
 *
 * 1 user → 1 company  (SaaS design decision)
 * 1 user → many outlets via user_outlets join table
 */
exports.up = (pgm) => {
  pgm.createTable('users', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'UUID',
      notNull: false, // NULL for SUPER_ADMIN
      references: '"companies"',
      onDelete: 'CASCADE',
    },
    role_id: {
      type: 'UUID',
      notNull: false, // NULL until role is assigned
      references: '"roles"',
      onDelete: 'SET NULL',
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    email: {
      type: 'VARCHAR(100)',
      notNull: true,
      unique: true,
    },
    password: {
      type: 'TEXT',
      notNull: true,
    },
    phone: {
      type: 'VARCHAR(30)',
      notNull: false,
    },
    is_super_admin: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
      comment: 'Platform-level admin — bypasses tenant and permission checks',
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

  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'company_id');
  pgm.createIndex('users', 'role_id');
  pgm.createIndex('users', 'is_active');
  pgm.createIndex('users', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};
