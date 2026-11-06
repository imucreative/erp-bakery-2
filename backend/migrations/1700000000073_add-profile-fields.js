/* eslint-disable camelcase */

/**
 * Migration: profile fields (doc 55 — platform console & profile screen)
 *
 * users   : avatar_url, job_title, last_login_at
 * companies: city, province, postal_code, country, tax_id, logo_url
 *
 * `users.name` is intentionally kept as a single field (used across the whole
 * application); first/last name are not split.
 */
exports.up = (pgm) => {
  pgm.addColumns('users', {
    avatar_url: { type: 'VARCHAR(500)' },
    job_title: { type: 'VARCHAR(100)' },
    last_login_at: { type: 'TIMESTAMP' },
  });

  pgm.addColumns('companies', {
    city: { type: 'VARCHAR(100)' },
    province: { type: 'VARCHAR(100)' },
    postal_code: { type: 'VARCHAR(20)' },
    country: { type: 'VARCHAR(100)', notNull: true, default: 'Indonesia' },
    tax_id: { type: 'VARCHAR(50)' },
    logo_url: { type: 'VARCHAR(500)' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['avatar_url', 'job_title', 'last_login_at']);
  pgm.dropColumns('companies', [
    'city',
    'province',
    'postal_code',
    'country',
    'tax_id',
    'logo_url',
  ]);
};
