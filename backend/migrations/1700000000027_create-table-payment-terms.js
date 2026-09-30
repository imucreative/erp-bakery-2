/* eslint-disable camelcase */

/**
 * Migration: payment_terms
 * Payment term master data (e.g. NET30, COD). Scoped per company, soft-deletable.
 * `code` is user-supplied (normalised trim + uppercase in the domain layer) and
 * unique per company. `due_days` is a non-negative integer.
 */
exports.up = (pgm) => {
  pgm.createTable('payment_terms', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'UUID',
      notNull: true,
      references: '"companies"',
      onDelete: 'CASCADE',
    },
    code: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    due_days: {
      type: 'INTEGER',
      notNull: true,
    },
    is_active: {
      type: 'BOOLEAN',
      notNull: true,
      default: true,
    },
    deleted_at: {
      type: 'TIMESTAMP',
      notNull: false,
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

  // due_days must be non-negative
  pgm.addConstraint('payment_terms', 'payment_terms_due_days_non_negative', 'CHECK (due_days >= 0)');

  // code unique per company
  pgm.addConstraint(
    'payment_terms',
    'payment_terms_code_company_unique',
    'UNIQUE (code, company_id)',
  );

  pgm.createIndex('payment_terms', 'company_id');
  pgm.createIndex('payment_terms', 'code');
  pgm.createIndex('payment_terms', 'is_active');
  pgm.createIndex('payment_terms', 'deleted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('payment_terms');
};
