/* eslint-disable camelcase */

/**
 * Migration: sales_returns (header — POS / Sales Fase 3 refund, doc 51 §4.8 / §8)
 *
 * A full-order refund (MVP; partial refund is a future extension — OQ-4). A
 * refund reverses the PAID order: it returns every consumed quantity to its
 * ORIGINAL batch (via SALE_RETURN inbound movements derived from
 * sales_consumptions) and flips the order to REFUNDED.
 *
 * MVP: a refund is created directly in the terminal `COMPLETED` status (there
 * is no draft/approval step). refund_amount = the order's grand_total.
 *
 * Company-scoped + outlet-scoped (doc 35 §3.1). Audit fields (doc 35 §4).
 */
exports.up = (pgm) => {
  pgm.createTable('sales_returns', {
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
      onDelete: 'RESTRICT',
    },
    reason: {
      type: 'TEXT',
      notNull: false,
    },
    refund_amount: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'COMPLETED',
    },
    returned_by: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
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
    'sales_returns',
    'sales_returns_status_check',
    "CHECK (status IN ('COMPLETED'))",
  );
  pgm.addConstraint(
    'sales_returns',
    'sales_returns_refund_amount_non_negative',
    'CHECK (refund_amount >= 0)',
  );
  // One full-order refund per order (MVP: full-order only, no partial refund).
  pgm.addConstraint(
    'sales_returns',
    'sales_returns_order_unique',
    'UNIQUE (sales_order_id)',
  );

  pgm.createIndex('sales_returns', 'company_id');
  pgm.createIndex('sales_returns', 'outlet_id');
  pgm.createIndex('sales_returns', 'sales_order_id');
  pgm.createIndex('sales_returns', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('sales_returns');
};
