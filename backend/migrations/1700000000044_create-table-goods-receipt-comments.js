/* eslint-disable camelcase */

/**
 * Migration: goods_receipt_comments (discussion thread)
 *
 * A collaboration thread attached to a Goods Receipt, separate from the
 * approval timeline (goods_receipt_status_logs). Mirrors
 * purchase_order_comments exactly. Comments are categorized per
 * global-erp-standards doc 35 §6: APPROVAL, INTERNAL, EXTERNAL, SYSTEM.
 *
 * - INTERNAL / APPROVAL / EXTERNAL: authored by users from the UI.
 * - SYSTEM: reserved for backend-generated event notes (never accepted from
 *   user input; enforced at the use-case layer).
 *
 * company_id is denormalized (same convention as goods_receipts) for fast
 * tenant scoping without an extra join. goods_receipt_id cascades on delete so
 * a hard-deleted GR would take its thread with it (GRs are soft-deleted in
 * practice, so the thread survives cancellation).
 */
exports.up = (pgm) => {
  pgm.createTable('goods_receipt_comments', {
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
    'goods_receipt_comments',
    'goods_receipt_comments_category_check',
    "CHECK (category IN ('APPROVAL','INTERNAL','EXTERNAL','SYSTEM'))",
  );

  pgm.createIndex('goods_receipt_comments', 'goods_receipt_id');
  pgm.createIndex('goods_receipt_comments', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('goods_receipt_comments');
};
