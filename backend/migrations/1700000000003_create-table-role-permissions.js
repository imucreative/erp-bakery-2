/* eslint-disable camelcase */

/**
 * Migration: role_permissions
 * Junction table — maps Roles to their granted Permissions.
 * Managed via seed scripts in Sprint 1 (no runtime UI).
 */
exports.up = (pgm) => {
  pgm.createTable('role_permissions', {
    role_id: {
      type: 'UUID',
      notNull: true,
      references: '"roles"',
      onDelete: 'CASCADE',
    },
    permission_id: {
      type: 'UUID',
      notNull: true,
      references: '"permissions"',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint(
    'role_permissions',
    'role_permissions_pkey',
    'PRIMARY KEY (role_id, permission_id)',
  );

  pgm.createIndex('role_permissions', 'role_id');
  pgm.createIndex('role_permissions', 'permission_id');
};

exports.down = (pgm) => {
  pgm.dropTable('role_permissions');
};
