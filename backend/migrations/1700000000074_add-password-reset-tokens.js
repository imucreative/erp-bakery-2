/* eslint-disable camelcase */

/**
 * Migration: password reset tokens — fitur "lupa password" (self-service).
 *
 * Token mentah TIDAK pernah disimpan; hanya hash SHA-256-nya (`token_hash`,
 * 64 karakter hex). Setiap baris sekali pakai: `used_at` diisi saat password
 * berhasil direset. Token lama milik user yang sama dibatalkan saat user meminta
 * token baru.
 *
 * Masa berlaku token diatur di application layer (60 menit, lihat
 * PasswordResetUseCases), bukan di skema, supaya mudah diubah.
 */
exports.up = (pgm) => {
  pgm.createTable('password_reset_tokens', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    token_hash: { type: 'varchar(64)', notNull: true, unique: true },
    expires_at: { type: 'timestamp', notNull: true },
    used_at: { type: 'timestamp' },
    requested_ip: { type: 'varchar(64)' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('password_reset_tokens', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('password_reset_tokens');
};
