/* eslint-disable camelcase */

/**
 * Migration: sales_orders (header — POS / Sales Fase 2, doc 51 §4.3)
 *
 * Lifecycle (doc 51 §6.1, DRAFT skipped — OQ-1):
 *   PENDING_PAYMENT -> PAID -> REFUNDED
 *   PENDING_PAYMENT -> CANCELLED
 * Checkout lands the order on PENDING_PAYMENT (no stock touched). Stock is
 * only deducted on PENDING_PAYMENT -> PAID (atomic FEFO, §7.2). REFUNDED is a
 * Fase 3 transition (defined in the status VO now, used later).
 *
 * Numbering: INV-YYYYMMDD-XXXXXX (counter per company + day, doc 35 §2).
 * Company-scoped + outlet-scoped (doc 35 §3.1). Soft-delete header + audit (§4).
 */
exports.up = (pgm) => {
  pgm.createTable('sales_orders', {
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
    shift_id: {
      type: 'UUID',
      notNull: true,
      references: '"shifts"',
      onDelete: 'RESTRICT',
    },
    invoice_number: {
      type: 'VARCHAR(30)',
      notNull: true,
      comment: 'INV-YYYYMMDD-XXXXXX',
    },
    customer_name: {
      type: 'VARCHAR(150)',
      notNull: false,
    },
    order_date: {
      type: 'DATE',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'PENDING_PAYMENT',
    },
    item_count: {
      type: 'INTEGER',
      notNull: true,
      default: 0,
    },
    subtotal: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    order_discount: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    tax: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    grand_total: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    cashier_user_id: {
      type: 'UUID',
      notNull: true,
      references: '"users"',
      onDelete: 'RESTRICT',
    },
    paid_at: {
      type: 'TIMESTAMP',
      notNull: false,
    },
    // Audit fields (doc 35 §4)
    created_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    updated_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    deleted_at: { type: 'TIMESTAMP', notNull: false },
    deleted_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'sales_orders',
    'sales_orders_number_company_unique',
    'UNIQUE (invoice_number, company_id)',
  );
  pgm.addConstraint(
    'sales_orders',
    'sales_orders_status_check',
    "CHECK (status IN ('PENDING_PAYMENT','PAID','CANCELLED','REFUNDED'))",
  );

  pgm.createIndex('sales_orders', 'company_id');
  pgm.createIndex('sales_orders', 'outlet_id');
  pgm.createIndex('sales_orders', 'shift_id');
  pgm.createIndex('sales_orders', 'status');
  pgm.createIndex('sales_orders', 'invoice_number');
  pgm.createIndex('sales_orders', 'cashier_user_id');
  pgm.createIndex('sales_orders', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('sales_orders');
};
