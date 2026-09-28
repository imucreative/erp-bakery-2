/* eslint-disable camelcase */

/**
 * Migration: stock_opnames (header)
 *
 * Physical stock count (inventory-domain rules #23-#25).
 * Lifecycle: DRAFT -> COUNTING -> SUBMITTED -> APPROVED -> COMPLETED
 *   with DRAFT/COUNTING/SUBMITTED -> CANCELLED allowed.
 * APPROVED and COMPLETED are not cancellable via normal workflow.
 *
 * DRAFT -> COUNTING captures a frozen qty_available snapshot into items and
 * hard-locks outlet stock mutation while COUNTING/SUBMITTED/APPROVED.
 * On completion, non-zero variance generates exactly one Stock Adjustment
 * (source_document_type = STOCK_OPNAME) that posts ADJUSTMENT_IN/OUT.
 */
exports.up = (pgm) => {
  pgm.createTable('stock_opnames', {
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
    opname_number: {
      type: 'VARCHAR(30)',
      notNull: true,
      comment: 'OPN-YYYY-NNNNNN',
    },
    opname_date: {
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
    // Link to the generated adjustment (set on completion when variance != 0)
    generated_adjustment_id: {
      type: 'UUID',
      notNull: false,
      references: '"stock_adjustments"',
      onDelete: 'SET NULL',
    },
    created_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    started_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    submitted_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    approved_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    completed_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    started_at: { type: 'TIMESTAMP', notNull: false },
    submitted_at: { type: 'TIMESTAMP', notNull: false },
    approved_at: { type: 'TIMESTAMP', notNull: false },
    completed_at: { type: 'TIMESTAMP', notNull: false },
    cancelled_at: { type: 'TIMESTAMP', notNull: false },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'stock_opnames',
    'stock_opnames_number_company_unique',
    'UNIQUE (opname_number, company_id)',
  );

  pgm.addConstraint(
    'stock_opnames',
    'stock_opnames_status_check',
    "CHECK (status IN ('DRAFT','COUNTING','SUBMITTED','APPROVED','COMPLETED','CANCELLED'))",
  );

  pgm.createIndex('stock_opnames', 'company_id');
  pgm.createIndex('stock_opnames', 'outlet_id');
  pgm.createIndex('stock_opnames', 'status');
  pgm.createIndex('stock_opnames', 'opname_number');
  pgm.createIndex('stock_opnames', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('stock_opnames');
};
