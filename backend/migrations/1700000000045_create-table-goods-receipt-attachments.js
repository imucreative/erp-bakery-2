/* eslint-disable camelcase */

/**
 * Migration: goods_receipt_attachments (file uploads)
 *
 * Files attached to a Goods Receipt (doc 35 §5 Reusable Attachment Standard,
 * doc 26 Procurement domain). Only PDF / JPEG / PNG are accepted and each file
 * is capped at 5 MB — both enforced at the use-case/multipart layer. The row
 * stores metadata only; the binary lives on disk under
 * /uploads/goods-receipt/<year>/ (relative to the backend root).
 *
 * - original_name: the client-supplied file name, kept for display/download.
 * - stored_path: the safe, server-derived relative path (never built from the
 *   raw original name — prevents path traversal). Example:
 *   uploads/goods-receipt/2026/<uuid>.pdf
 * - company_id is denormalized (same convention as goods_receipt_comments)
 *   for fast tenant scoping without an extra join.
 *
 * goods_receipt_id cascades on delete so a hard-deleted GR would take its
 * attachment rows with it (GRs are soft-deleted/cancelled in practice, so
 * attachments survive cancellation). The physical file removal on individual
 * delete is handled by the use case.
 *
 * Mirrors purchase_order_attachments (migration 039) exactly.
 */
exports.up = (pgm) => {
  pgm.createTable('goods_receipt_attachments', {
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
    company_id: {
      type: 'UUID',
      notNull: true,
      references: '"companies"',
      onDelete: 'CASCADE',
    },
    original_name: {
      type: 'VARCHAR(255)',
      notNull: true,
    },
    stored_path: {
      type: 'TEXT',
      notNull: true,
    },
    mime_type: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    size_bytes: {
      type: 'BIGINT',
      notNull: true,
    },
    uploaded_by: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'goods_receipt_attachments',
    'goods_receipt_attachments_mime_type_check',
    "CHECK (mime_type IN ('application/pdf','image/jpeg','image/png'))",
  );
  pgm.addConstraint(
    'goods_receipt_attachments',
    'goods_receipt_attachments_size_bytes_positive',
    'CHECK (size_bytes > 0)',
  );

  pgm.createIndex('goods_receipt_attachments', 'goods_receipt_id');
};

exports.down = (pgm) => {
  pgm.dropTable('goods_receipt_attachments');
};
