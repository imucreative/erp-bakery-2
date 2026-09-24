/* eslint-disable camelcase */

/**
 * Migration: roles
 * Defines system roles. Scoped per company (tenant-aware).
 * SUPER_ADMIN is platform-level and has no company scope.
 */
exports.up = (pgm) => {
  pgm.createTable('roles', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'UUID',
      notNull: false, // NULL = platform-level role (SUPER_ADMIN)
      references: '"companies"',
      onDelete: 'CASCADE',
    },
    code: {
      type: 'VARCHAR(50)',
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

  // code must be unique per company (or globally for platform roles with NULL company_id)
  pgm.addConstraint(
    'roles',
    'roles_code_company_unique',
    'UNIQUE (code, company_id)',
  );

  pgm.createIndex('roles', 'company_id');
  pgm.createIndex('roles', 'code');
};

exports.down = (pgm) => {
  pgm.dropTable('roles');
};
