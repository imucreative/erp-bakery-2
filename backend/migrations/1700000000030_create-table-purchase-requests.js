/* eslint-disable camelcase */

/**
 * Migration: purchase_requests (header)
 *
 * First procurement document module (procurement-foundation doc 33,
 * purchase-request-blueprint doc 34). Company-scoped.
 *
 * Lifecycle (global-erp-standards doc 35 §1):
 *   DRAFT -> SUBMITTED -> APPROVED
 *   DRAFT -> SUBMITTED -> REJECTED
 *   REJECTED -> DRAFT (via update/resubmit) | REJECTED -> CANCELLED
 *   DRAFT -> CANCELLED
 * APPROVED and CANCELLED are terminal.
 *
 * Documents are soft-deleted (deleted_at) + CANCELLED status, never hard-deleted,
 * matching the Payment Term soft-delete convention. pr_number is unique per
 * company via a PARTIAL unique index (WHERE deleted_at IS NULL) so a cancelled/
 * soft-deleted number never blocks the running sequence.
 *
 * Audit fields follow doc 35 §4.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_requests', {
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
    pr_number: {
      type: 'VARCHAR(40)',
      notNull: true,
      comment: 'PR-{outletCode}-YYYY-NNNNNN',
    },
    requestor_id: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    destination_outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'RESTRICT',
    },
    expected_date: {
      type: 'DATE',
      notNull: true,
    },
    total_estimated_amount: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
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
    // ── Audit trail (doc 35 §4) ──────────────────────────────────
    created_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    updated_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    approved_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    deleted_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    approved_at: { type: 'TIMESTAMP', notNull: false },
    deleted_at: { type: 'TIMESTAMP', notNull: false },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'purchase_requests',
    'purchase_requests_status_check',
    "CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED'))",
  );

  // pr_number unique per company, ignoring soft-deleted rows
  pgm.createIndex('purchase_requests', ['pr_number', 'company_id'], {
    unique: true,
    name: 'purchase_requests_number_company_unique',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('purchase_requests', 'company_id');
  pgm.createIndex('purchase_requests', 'status');
  pgm.createIndex('purchase_requests', 'destination_outlet_id');
  pgm.createIndex('purchase_requests', 'requestor_id');
  pgm.createIndex('purchase_requests', 'deleted_at');
  pgm.createIndex('purchase_requests', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_requests');
};
