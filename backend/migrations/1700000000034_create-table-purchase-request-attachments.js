/* eslint-disable camelcase */

/**
 * Migration: purchase_request_attachments (file uploads)
 *
 * Files attached to a Purchase Request (doc 35 §5 Reusable Attachment
 * Standard, doc 34 §3 Attachments section). Only PDF / JPEG / PNG are accepted
 * and each file is capped at 5 MB — both enforced at the use-case/multipart
 * layer. The row stores metadata only; the binary lives on disk under
 * /uploads/purchase-request/<year>/ (relative to the backend root).
 *
 * - original_name: the client-supplied file name, kept for display/download.
 * - stored_path: the safe, server-derived relative path (never built from the
 *   raw original name — prevents path traversal). Example:
 *   uploads/purchase-request/2026/<uuid>.pdf
 * - company_id is denormalized (same convention as purchase_request_comments)
 *   for fast tenant scoping without an extra join.
 *
 * purchase_request_id cascades on delete so a hard-deleted PR would take its
 * attachment rows with it (PRs are soft-deleted in practice, so attachments
 * survive cancellation). The physical file removal on individual delete is
 * handled by the use case.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_request_attachments', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    purchase_request_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_requests"',
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
    'purchase_request_attachments',
    'purchase_request_attachments_mime_type_check',
    "CHECK (mime_type IN ('application/pdf','image/jpeg','image/png'))",
  );
  pgm.addConstraint(
    'purchase_request_attachments',
    'purchase_request_attachments_size_bytes_positive',
    'CHECK (size_bytes > 0)',
  );

  pgm.createIndex('purchase_request_attachments', 'purchase_request_id');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_request_attachments');
};
