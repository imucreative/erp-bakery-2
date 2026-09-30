/* eslint-disable camelcase */

/**
 * Migration: add suppliers.default_payment_term_id
 *
 * Adds an OPTIONAL (nullable) default payment term to a supplier. Used as the
 * default payment condition for downstream procurement documents (e.g. Purchase
 * Order). Doc 26 §3 lists "Default Payment Term ID" as a Vendor (Supplier) field.
 *
 * FK -> payment_terms(id) with ON DELETE SET NULL: if a payment term is ever
 * hard-deleted, referencing suppliers simply lose the default rather than
 * blocking. Soft-delete/deactivation protection is enforced at the service layer.
 */
exports.up = (pgm) => {
  pgm.addColumn('suppliers', {
    default_payment_term_id: {
      type: 'UUID',
      notNull: false,
      references: '"payment_terms"',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('suppliers', 'default_payment_term_id');
};

exports.down = (pgm) => {
  pgm.dropColumn('suppliers', 'default_payment_term_id');
};
