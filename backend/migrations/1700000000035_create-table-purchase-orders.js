/* eslint-disable camelcase */

/**
 * Migration: purchase_orders (header)
 *
 * Second procurement document module (procurement-domain doc 26,
 * procurement-foundation doc 33). Company-scoped.
 *
 * A PO is always raised from an APPROVED Purchase Request (doc 26 §8 MVP) and
 * always links to an active Vendor/Supplier (doc 26 §6.1). Payment Term is
 * snapshotted (doc 26 §6.3/§6.5) and the estimated payment due date is
 * backend-computed from order_date + payment_term_due_days (doc 26 §6.4).
 *
 * Lifecycle (procurement-domain doc 26 §5, global-erp-standards doc 35 §1):
 *   DRAFT     -> SUBMITTED | CANCELLED
 *   SUBMITTED -> APPROVED  | REJECTED
 *   REJECTED  -> DRAFT (via update/resubmit) | CANCELLED
 *   APPROVED  -> CANCELLED (owner voids order)
 * CANCELLED is terminal.
 *
 * Documents are soft-deleted (deleted_at) + CANCELLED status, never hard-deleted,
 * matching the Purchase Request convention. po_number is unique per company via
 * a PARTIAL unique index (WHERE deleted_at IS NULL) so a cancelled/soft-deleted
 * number never blocks the running sequence.
 *
 * Numbering: PO-{outletCode}-YYYY-NNNNNN (destination outlet, doc 26 §10,
 * doc 35 §2). Audit fields follow doc 35 §4.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_orders', {
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
    po_number: {
      type: 'VARCHAR(40)',
      notNull: true,
      comment: 'PO-{outletCode}-YYYY-NNNNNN',
    },
    purchase_request_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_requests"',
      onDelete: 'RESTRICT',
    },
    supplier_id: {
      type: 'UUID',
      notNull: true,
      references: '"suppliers"',
      onDelete: 'RESTRICT',
    },
    destination_outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'RESTRICT',
    },
    order_date: {
      type: 'DATE',
      notNull: true,
    },
    // ── Payment Term reference + snapshot (doc 26 §6.3/§6.5) ──────
    payment_term_id: {
      type: 'UUID',
      notNull: false,
      references: '"payment_terms"',
      onDelete: 'RESTRICT',
    },
    payment_term_code: { type: 'VARCHAR(20)', notNull: false },
    payment_term_name: { type: 'VARCHAR(100)', notNull: false },
    payment_term_due_days: { type: 'INTEGER', notNull: false },
    // Backend-computed = order_date + payment_term_due_days (doc 26 §6.4)
    estimated_payment_due_date: { type: 'DATE', notNull: false },
    // ── Server-computed money totals (anti-tamper) ───────────────
    total_amount: { type: 'NUMERIC(18,2)', notNull: true, default: 0 },
    tax_total: { type: 'NUMERIC(18,2)', notNull: true, default: 0 },
    grand_total: { type: 'NUMERIC(18,2)', notNull: true, default: 0 },
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
    'purchase_orders',
    'purchase_orders_status_check',
    "CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED'))",
  );

  // po_number unique per company, ignoring soft-deleted rows
  pgm.createIndex('purchase_orders', ['po_number', 'company_id'], {
    unique: true,
    name: 'purchase_orders_number_company_unique',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('purchase_orders', 'company_id');
  pgm.createIndex('purchase_orders', 'status');
  pgm.createIndex('purchase_orders', 'supplier_id');
  pgm.createIndex('purchase_orders', 'purchase_request_id');
  pgm.createIndex('purchase_orders', 'destination_outlet_id');
  pgm.createIndex('purchase_orders', 'deleted_at');
  pgm.createIndex('purchase_orders', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_orders');
};
