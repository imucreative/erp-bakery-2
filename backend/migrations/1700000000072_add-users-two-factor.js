/* eslint-disable camelcase */

/**
 * Migration: users 2FA (TOTP) — security baseline Super Admin (doc 55 §3.3)
 *
 * Super Admin accounts must support TOTP-based two-factor authentication.
 *  - two_factor_secret: AES-256-GCM ciphertext (base64) of the Base32 secret.
 *  - two_factor_enabled: master switch; only flipped after a successful code check.
 *  - two_factor_recovery_codes: JSON array of bcrypt hashes (single-use each).
 *  - two_factor_confirmed_at: audit timestamp of the last successful enrollment.
 */
exports.up = (pgm) => {
  pgm.addColumns('users', {
    two_factor_secret: { type: 'TEXT' },
    two_factor_enabled: { type: 'BOOLEAN', notNull: true, default: false },
    two_factor_recovery_codes: { type: 'TEXT' },
    two_factor_confirmed_at: { type: 'TIMESTAMP' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', [
    'two_factor_secret',
    'two_factor_enabled',
    'two_factor_recovery_codes',
    'two_factor_confirmed_at',
  ]);
};
