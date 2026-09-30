/* eslint-disable camelcase */

/**
 * Migration: fix payment_terms code uniqueness
 *
 * The original migration (1700000000027) defined
 * `payment_terms_code_company_unique` as a plain `UNIQUE (code, company_id)`
 * constraint. Because a plain constraint counts soft-deleted rows, reusing a
 * `code` after soft-deleting it triggered a Postgres duplicate-key error (500),
 * even though the repository (`isCodeTaken`) and use case only consider rows
 * with `deleted_at IS NULL`.
 *
 * This migration replaces the constraint with a PARTIAL UNIQUE INDEX that only
 * applies to active (non-deleted) rows: unique on `(code, company_id)` WHERE
 * `deleted_at IS NULL`. Soft-deleted codes may then be reused, while duplicate
 * ACTIVE codes are still rejected — consistent with the application logic.
 */
exports.up = (pgm) => {
  // Drop the plain unique constraint that also covers soft-deleted rows.
  pgm.dropConstraint('payment_terms', 'payment_terms_code_company_unique');

  // Recreate uniqueness as a partial unique index over ACTIVE rows only.
  pgm.createIndex('payment_terms', ['code', 'company_id'], {
    unique: true,
    name: 'payment_terms_code_company_unique',
    where: 'deleted_at IS NULL',
  });
};

exports.down = (pgm) => {
  // Revert: drop the partial unique index and restore the plain constraint.
  pgm.dropIndex('payment_terms', ['code', 'company_id'], {
    name: 'payment_terms_code_company_unique',
  });

  pgm.addConstraint(
    'payment_terms',
    'payment_terms_code_company_unique',
    'UNIQUE (code, company_id)',
  );
};
