/* eslint-disable camelcase */

/**
 * Migration: user_outlets
 * Many-to-many: a user can access multiple outlets within their company.
 * OWNER role users implicitly have access to all outlets (enforced in application logic).
 * Non-OWNER users must have explicit assignments here.
 */
exports.up = (pgm) => {
  pgm.createTable('user_outlets', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'CASCADE',
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
  });

  pgm.addConstraint(
    'user_outlets',
    'user_outlets_user_outlet_unique',
    'UNIQUE (user_id, outlet_id)',
  );

  pgm.createIndex('user_outlets', 'user_id');
  pgm.createIndex('user_outlets', 'outlet_id');
};

exports.down = (pgm) => {
  pgm.dropTable('user_outlets');
};
