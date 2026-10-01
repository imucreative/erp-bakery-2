/* eslint-disable camelcase */

/**
 * Migration: goods_receipts (header)
 *
 * Third procurement document module (procurement-domain doc 26, foundation
 * doc 33). Company-scoped.
 *
 * A GR is always raised from an APPROVED Purchase Order (doc 26 §4 — a PO can
 * have many partial receipts). supplier_id and destination_outlet_id are
 * SNAPSHOTS inherited from the source PO (not user input) so the document stays
 * readable even if the PO changes later.
 *
 * STAGE 1 (this migration + its module) implements the CORE DOCUMENT + approval
 * timeline ONLY. Inventory posting is a SEPARATE Stage 2: no stock is created
 * yet. The `inventory_posted_at` marker column is added now so Stage 2 can mark
 * posting idempotently (doc 27 §6 #5) without a schema change.
 *
 * Lifecycle (doc 26 §5 subset, doc 35 §1):
 *   DRAFT     -> COMPLETED (Stage 2: posts inventory) | CANCELLED (soft-delete)
 *   COMPLETED -> (terminal; corrections flow through Purchase Return/adjustment)
 *   CANCELLED -> (terminal)
 * Stage 1 only wires DRAFT -> CANCELLED; the status VO already allows
 * DRAFT -> COMPLETED so Stage 2 can add the complete action with no migration.
 *
 * Documents are soft-deleted (deleted_at) + CANCELLED status, never hard-deleted,
 * matching the PR/PO convention. gr_number is unique per company via a PARTIAL
 * unique index (WHERE deleted_at IS NULL) so a cancelled/soft-deleted number
 * never blocks the running sequence.
 *
 * Numbering: GR-YYYY-NNNNNN (doc 26 §10, doc 35 §2 — unlike PR/PO, GR does NOT
 * embed an outlet code). Audit fields follow doc 35 §4.
 */
exports.up = (pgm) => {
  pgm.createTable('goods_receipts', {
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
    gr_number: {
      type: 'VARCHAR(40)',
      notNull: true,
      comment: 'GR-YYYY-NNNNNN',
    },
    purchase_order_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_orders"',
      onDelete: 'RESTRICT',
    },
    // Snapshots inherited from the source PO (doc 26 §3) — not user input.
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
    receive_date: {
      type: 'DATE',
      notNull: true,
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'DRAFT',
    },
    // Stage 2 inventory-posting idempotency marker (doc 27 §6 #5). Null until a
    // GR is COMPLETED and its accepted quantities are posted to inventory.
    inventory_posted_at: { type: 'TIMESTAMP', notNull: false },
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
    'goods_receipts',
    'goods_receipts_status_check',
    "CHECK (status IN ('DRAFT','COMPLETED','CANCELLED'))",
  );

  // gr_number unique per company, ignoring soft-deleted rows
  pgm.createIndex('goods_receipts', ['gr_number', 'company_id'], {
    unique: true,
    name: 'goods_receipts_number_company_unique',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('goods_receipts', 'company_id');
  pgm.createIndex('goods_receipts', 'status');
  pgm.createIndex('goods_receipts', 'supplier_id');
  pgm.createIndex('goods_receipts', 'purchase_order_id');
  pgm.createIndex('goods_receipts', 'destination_outlet_id');
  pgm.createIndex('goods_receipts', 'deleted_at');
  pgm.createIndex('goods_receipts', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('goods_receipts');
};
