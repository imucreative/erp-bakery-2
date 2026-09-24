/* eslint-disable camelcase */

/**
 * Migration: authentications
 * Stores active refresh tokens — mirrors sample-be pattern.
 * A row exists as long as the refresh token is valid/active.
 * On logout, the row is deleted.
 */
exports.up = (pgm) => {
  pgm.createTable('authentications', {
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
    refresh_token: {
      type: 'TEXT',
      notNull: true,
    },
    expired_at: {
      type: 'TIMESTAMP',
      notNull: true,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('authentications', 'user_id');
  pgm.createIndex('authentications', 'refresh_token');
  pgm.createIndex('authentications', 'expired_at');
};

exports.down = (pgm) => {
  pgm.dropTable('authentications');
};
