/* eslint-disable camelcase */

/**
 * Migration: goods_receipt_items (lines)
 *
 * Each line receives (part of) a source PO line (doc 26 §3 GR Line Item).
 *
 * Quantity model (MVP, approved 2026-10-01 [17:30]):
 *   ordered_quantity  — snapshot of the source PO line quantity (read-only).
 *   accepted_quantity — quantity accepted into stock (>= 0).
 *   rejected_quantity — quantity rejected / discrepancy (>= 0).
 *   received = accepted + rejected (derived, not stored).
 * damaged/pending quantities are intentionally DEFERRED.
 *
 * Invariant enforced in the service layer (doc 26 §6.8/§6.9):
 *   accepted + rejected <= OUTSTANDING of the source PO line, and each included
 *   line must have accepted > 0 or rejected > 0. A GR may receive a subset of
 *   the PO lines.
 *
 * Batch & expiry (doc 27 §6 #10): for a batch-tracked product with
 * accepted_quantity > 0, batch_number AND expiry_date are mandatory (enforced
 * in the domain). Non-batch products leave them null. The columns are nullable
 * here because rejected-only or non-batch lines carry no batch; the domain is
 * the authority on when they are required.
 *
 * ON DELETE CASCADE with the header so a hard-deleted header (tests only) cleans
 * its lines; normal flow soft-deletes the header.
 */
exports.up = (pgm) => {
  pgm.createTable('goods_receipt_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    goods_receipt_id: {
      type: 'UUID',
      notNull: true,
      references: '"goods_receipts"',
      onDelete: 'CASCADE',
    },
    purchase_order_item_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_order_items"',
      onDelete: 'RESTRICT',
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    ordered_quantity: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
    },
    accepted_quantity: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
    },
    rejected_quantity: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
    },
    uom_id: {
      type: 'UUID',
      notNull: true,
      references: '"uoms"',
      onDelete: 'RESTRICT',
    },
    batch_number: {
      type: 'VARCHAR(100)',
      notNull: false,
    },
    lot_number: {
      type: 'VARCHAR(100)',
      notNull: false,
    },
    expiry_date: {
      type: 'DATE',
      notNull: false,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'goods_receipt_items',
    'goods_receipt_items_accepted_non_negative',
    'CHECK (accepted_quantity >= 0)',
  );
  pgm.addConstraint(
    'goods_receipt_items',
    'goods_receipt_items_rejected_non_negative',
    'CHECK (rejected_quantity >= 0)',
  );

  pgm.createIndex('goods_receipt_items', 'goods_receipt_id');
  pgm.createIndex('goods_receipt_items', 'purchase_order_item_id');
  pgm.createIndex('goods_receipt_items', 'product_id');
  pgm.createIndex('goods_receipt_items', 'uom_id');
};

exports.down = (pgm) => {
  pgm.dropTable('goods_receipt_items');
};
