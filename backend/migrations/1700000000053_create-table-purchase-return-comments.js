/* eslint-disable camelcase */

/**
 * Migration: purchase_return_comments (discussion thread)
 *
 * A collaboration thread attached to a Purchase Return, separate from the
 * approval timeline (purchase_return_status_logs). Mirrors
 * goods_receipt_comments exactly. Comments are categorized per
 * global-erp-standards doc 35 §6: APPROVAL, INTERNAL, EXTERNAL, SYSTEM.
 *
 * - INTERNAL / APPROVAL / EXTERNAL: authored by users from the UI.
 * - SYSTEM: reserved for backend-generated event notes (never accepted from
 *   user input; enforced at the use-case layer).
 *
 * company_id is denormalized (same convention as purchase_returns) for fast
 * tenant scoping without an extra join. purchase_return_id cascades on delete so
 * a hard-deleted return would take its thread with it (returns are
 * soft-deleted/cancelled in practice, so the thread survives cancellation).
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_return_comments', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    purchase_return_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_returns"',
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
    'purchase_return_comments',
    'purchase_return_comments_category_check',
    "CHECK (category IN ('APPROVAL','INTERNAL','EXTERNAL','SYSTEM'))",
  );

  pgm.createIndex('purchase_return_comments', 'purchase_return_id');
  pgm.createIndex('purchase_return_comments', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_return_comments');
};
