/* eslint-disable camelcase */

/**
 * Migration: UOM code uniqueness over active rows only
 *
 * The original migration (1700000000011) defined
 * `uoms_code_company_unique` as a plain `UNIQUE (code, company_id)`
 * constraint. That constraint also counts soft-deleted rows, so a code could
 * never be reused after its UOM was deleted — even though the UI now lets
 * users type their own code (initials such as KG/PCS) and expects the code to
 * be free again once the previous UOM is gone.
 *
 * This migration mirrors the Payment Term (1700000000028) and Product
 * (1700000000069) fixes: replace the plain constraint with a PARTIAL UNIQUE
 * INDEX over active rows only. Duplicate ACTIVE codes are still rejected by
 * the database; the repository maps the unique violation to
 * `UOM.CODE_ALREADY_USED` (409).
 */
exports.up = (pgm) => {
  pgm.dropConstraint('uoms', 'uoms_code_company_unique');

  pgm.createIndex('uoms', ['code', 'company_id'], {
    unique: true,
    name: 'uoms_code_company_unique',
    where: 'deleted_at IS NULL',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('uoms', ['code', 'company_id'], {
    name: 'uoms_code_company_unique',
  });

  pgm.addConstraint('uoms', 'uoms_code_company_unique', 'UNIQUE (code, company_id)');
};
