/* eslint-disable camelcase */

/**
 * Migration: goods_receipt_status_logs (approval timeline)
 *
 * Append-only trail of every status transition for a Goods Receipt
 * (doc 35 §4 audit, doc 26 §5 lifecycle). One row per transition:
 * create (null -> DRAFT), cancel (DRAFT -> CANCELLED), and — in Stage 2 —
 * complete (DRAFT -> COMPLETED). `note` carries the optional actor comment.
 *
 * Detail queries JOIN users to resolve `actor_name` for the frontend timeline.
 */
exports.up = (pgm) => {
  pgm.createTable('goods_receipt_status_logs', {
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
    from_status: {
      type: 'VARCHAR(20)',
      notNull: false,
    },
    to_status: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    actor_id: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    note: {
      type: 'TEXT',
      notNull: false,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('goods_receipt_status_logs', 'goods_receipt_id');
  pgm.createIndex('goods_receipt_status_logs', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('goods_receipt_status_logs');
};
