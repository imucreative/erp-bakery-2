/* eslint-disable camelcase */

/**
 * Migration: purchase_request_comments (discussion thread)
 *
 * A collaboration thread attached to a Purchase Request, separate from the
 * approval timeline (purchase_request_status_logs). Comments are categorized
 * per global-erp-standards doc 35 §6: APPROVAL, INTERNAL, EXTERNAL, SYSTEM.
 *
 * - INTERNAL / APPROVAL / EXTERNAL: authored by users from the UI.
 * - SYSTEM: reserved for backend-generated event notes (never accepted from
 *   user input; enforced at the use-case layer).
 *
 * company_id is denormalized (same convention as purchase_requests) for fast
 * tenant scoping without an extra join. purchase_request_id cascades on delete
 * so a hard-deleted PR would take its thread with it (PRs are soft-deleted in
 * practice, so the thread survives cancellation).
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_request_comments', {
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
    author_id: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    category: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'INTERNAL',
    },
    body: {
      type: 'TEXT',
      notNull: true,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'purchase_request_comments',
    'purchase_request_comments_category_check',
    "CHECK (category IN ('APPROVAL','INTERNAL','EXTERNAL','SYSTEM'))",
  );

  pgm.createIndex('purchase_request_comments', 'purchase_request_id');
  pgm.createIndex('purchase_request_comments', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_request_comments');
};
