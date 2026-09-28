/* eslint-disable camelcase */

/**
 * Migration: stock_adjustments (header)
 *
 * Explicit stock correction document (inventory-domain rules #19-#22).
 * Lifecycle: DRAFT -> SUBMITTED -> APPROVED -> COMPLETED
 *   with DRAFT -> CANCELLED and SUBMITTED -> CANCELLED allowed.
 * APPROVED and COMPLETED are not cancellable. COMPLETED is terminal.
 *
 * Stock is mutated ONLY on completion, via the inventory ledger
 * (ADJUSTMENT_IN / ADJUSTMENT_OUT) — never on draft/submit/approve.
 */
exports.up = (pgm) => {
  pgm.createTable('stock_adjustments', {
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
    adjustment_number: {
      type: 'VARCHAR(30)',
      notNull: true,
      comment: 'ADJ-YYYY-NNNNNN',
    },
    adjustment_date: {
      type: 'DATE',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'DRAFT',
    },
    notes: {
      type: 'TEXT',
      notNull: false,
    },
    // Audit trail of lifecycle actors
    created_by: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    submitted_by: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    approved_by: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    completed_by: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    submitted_at: { type: 'TIMESTAMP', notNull: false },
    approved_at: { type: 'TIMESTAMP', notNull: false },
    completed_at: { type: 'TIMESTAMP', notNull: false },
    cancelled_at: { type: 'TIMESTAMP', notNull: false },
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

  pgm.addConstraint(
    'stock_adjustments',
    'stock_adjustments_number_company_unique',
    'UNIQUE (adjustment_number, company_id)',
  );

  pgm.addConstraint(
    'stock_adjustments',
    'stock_adjustments_status_check',
    "CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','COMPLETED','CANCELLED'))",
  );

  pgm.createIndex('stock_adjustments', 'company_id');
  pgm.createIndex('stock_adjustments', 'outlet_id');
  pgm.createIndex('stock_adjustments', 'status');
  pgm.createIndex('stock_adjustments', 'adjustment_number');
  pgm.createIndex('stock_adjustments', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('stock_adjustments');
};
