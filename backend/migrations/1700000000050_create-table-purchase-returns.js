/* eslint-disable camelcase */

/**
 * Migration: purchase_returns (header)
 *
 * Fourth procurement document module (procurement-domain doc 26 §3/§6 #14–#20,
 * foundation doc 33). Company-scoped. A Purchase Return sends goods that were
 * already received (from a COMPLETED Goods Receipt) BACK to the vendor.
 *
 * A PR(eturn) is always raised from a COMPLETED Goods Receipt (doc 26 §6 #14):
 * the vendor + outlet are SNAPSHOTS inherited from the source GR (not user
 * input) so the document stays readable even if the GR/PO changes later. The
 * source goods_receipt_id and purchase_order_id (also a snapshot inherited from
 * the GR) are kept for traceability.
 *
 * Lifecycle (doc 26 §6 #18, approved by user — NO APPROVED step):
 *   DRAFT     -> SUBMITTED (reserves returnable) | CANCELLED
 *   SUBMITTED -> COMPLETED (posts RETURN reversal) | CANCELLED (releases reservation)
 *   COMPLETED -> (terminal)
 *   CANCELLED -> (terminal)
 * The status VO (returnStatus.ts) is the single source of truth for transitions.
 *
 * Reservation model (doc 26 §6 #18): DRAFT does NOT reserve; SUBMITTED reserves
 * the returnable quantity; CANCELLED releases it; COMPLETED consumes it. The
 * returnable quantity is DERIVED (never stored as the sole truth) from the
 * posted accepted inventory movement (PURCHASE) minus completed + submitted
 * return quantities — see purchase_return_items + getReturnable.
 *
 * Numbering: RTN-YYYY-NNNNNN (doc 35 §2 — no outlet code). return_number is
 * unique per company via a PARTIAL unique index (WHERE deleted_at IS NULL) so a
 * soft-deleted number never blocks the running sequence.
 *
 * Soft-delete convention mirrors Goods Receipt (Opsi A, 2026-10-02): CANCELLED
 * is a terminal business status that stays VISIBLE in list views and does NOT
 * set deleted_at. deleted_at is reserved for genuine hard-delete only. Audit
 * fields follow doc 35 §4.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_returns', {
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
    return_number: {
      type: 'VARCHAR(40)',
      notNull: true,
      comment: 'RTN-YYYY-NNNNNN',
    },
    goods_receipt_id: {
      type: 'UUID',
      notNull: true,
      references: '"goods_receipts"',
      onDelete: 'RESTRICT',
    },
    // Snapshot inherited from the source GR (doc 26 §3) — not user input.
    purchase_order_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_orders"',
      onDelete: 'RESTRICT',
    },
    // Vendor snapshot (id + code + name) inherited from the source GR/supplier.
    supplier_id: {
      type: 'UUID',
      notNull: true,
      references: '"suppliers"',
      onDelete: 'RESTRICT',
    },
    supplier_code: {
      type: 'VARCHAR(60)',
      notNull: true,
    },
    supplier_name: {
      type: 'VARCHAR(200)',
      notNull: true,
    },
    // Outlet snapshot (id + code + name) inherited from the source GR.
    outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'RESTRICT',
    },
    outlet_code: {
      type: 'VARCHAR(60)',
      notNull: true,
    },
    outlet_name: {
      type: 'VARCHAR(200)',
      notNull: true,
    },
    return_date: {
      type: 'DATE',
      notNull: true,
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
    submitted_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    completed_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    cancelled_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    deleted_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    submitted_at: { type: 'TIMESTAMP', notNull: false },
    completed_at: { type: 'TIMESTAMP', notNull: false },
    cancelled_at: { type: 'TIMESTAMP', notNull: false },
    deleted_at: { type: 'TIMESTAMP', notNull: false },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'purchase_returns',
    'purchase_returns_status_check',
    "CHECK (status IN ('DRAFT','SUBMITTED','COMPLETED','CANCELLED'))",
  );

  // return_number unique per company, ignoring soft-deleted rows
  pgm.createIndex('purchase_returns', ['return_number', 'company_id'], {
    unique: true,
    name: 'purchase_returns_number_company_unique',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('purchase_returns', 'company_id');
  pgm.createIndex('purchase_returns', 'status');
  pgm.createIndex('purchase_returns', 'goods_receipt_id');
  pgm.createIndex('purchase_returns', 'purchase_order_id');
  pgm.createIndex('purchase_returns', 'supplier_id');
  pgm.createIndex('purchase_returns', 'outlet_id');
  pgm.createIndex('purchase_returns', 'deleted_at');
  pgm.createIndex('purchase_returns', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_returns');
};
