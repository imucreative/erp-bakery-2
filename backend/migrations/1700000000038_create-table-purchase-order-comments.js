/* eslint-disable camelcase */

/**
 * Migration: purchase_order_comments (discussion thread)
 *
 * A collaboration thread attached to a Purchase Order, separate from the
 * approval timeline (purchase_order_status_logs). Mirrors
 * purchase_request_comments exactly. Comments are categorized per
 * global-erp-standards doc 35 §6: APPROVAL, INTERNAL, EXTERNAL, SYSTEM.
 *
 * - INTERNAL / APPROVAL / EXTERNAL: authored by users from the UI.
 * - SYSTEM: reserved for backend-generated event notes (never accepted from
 *   user input; enforced at the use-case layer).
 *
 * company_id is denormalized (same convention as purchase_orders) for fast
 * tenant scoping without an extra join. purchase_order_id cascades on delete
 * so a hard-deleted PO would take its thread with it (POs are soft-deleted in
 * practice, so the thread survives cancellation).
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_order_comments', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    purchase_order_id: {
      type: 'UUID',
      notNull: true,
      references: '"purchase_orders"',
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
    'purchase_order_comments',
    'purchase_order_comments_category_check',
    "CHECK (category IN ('APPROVAL','INTERNAL','EXTERNAL','SYSTEM'))",
  );

  pgm.createIndex('purchase_order_comments', 'purchase_order_id');
  pgm.createIndex('purchase_order_comments', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_order_comments');
};
