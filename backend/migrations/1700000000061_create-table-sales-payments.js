/* eslint-disable camelcase */

/**
 * Migration: sales_payments (POS / Sales Fase 2, doc 51 §4.6)
 *
 * Multi-payment per order (1 order -> many payments; UI MVP may use one method,
 * OQ-7). Σ amount must equal the order grand_total (validated in the pay
 * transaction, PAYMENT.AMOUNT_MISMATCH). Only CASH payments feed shift
 * expected_cash reconciliation (OQ-8, §4.2).
 *
 * Company-scoped + outlet-scoped (doc 35 §3.1). Minimal audit (created_at).
 */
exports.up = (pgm) => {
  pgm.createTable('sales_payments', {
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
    outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'RESTRICT',
    },
    sales_order_id: {
      type: 'UUID',
      notNull: true,
      references: '"sales_orders"',
      onDelete: 'CASCADE',
    },
    payment_method: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    amount: {
      type: 'NUMERIC(18,2)',
      notNull: true,
    },
    reference_no: {
      type: 'VARCHAR(100)',
      notNull: false,
    },
    paid_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    created_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint('sales_payments', 'sales_payments_amount_positive', 'CHECK (amount > 0)');
  pgm.addConstraint(
    'sales_payments',
    'sales_payments_method_check',
    "CHECK (payment_method IN ('CASH','CARD','QRIS','BANK_TRANSFER'))",
  );

  pgm.createIndex('sales_payments', 'company_id');
  pgm.createIndex('sales_payments', 'outlet_id');
  pgm.createIndex('sales_payments', 'sales_order_id');
  pgm.createIndex('sales_payments', 'payment_method');
};

exports.down = (pgm) => {
  pgm.dropTable('sales_payments');
};
