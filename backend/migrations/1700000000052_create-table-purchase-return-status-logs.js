/* eslint-disable camelcase */

/**
 * Migration: purchase_return_status_logs (lifecycle timeline)
 *
 * Append-only trail of every status transition for a Purchase Return
 * (doc 35 §4 audit, doc 26 §6 #18 lifecycle). One row per transition:
 * create (null -> DRAFT), submit (DRAFT -> SUBMITTED), complete
 * (SUBMITTED -> COMPLETED), and cancel (DRAFT|SUBMITTED -> CANCELLED).
 * `note` carries the optional actor comment.
 *
 * Detail queries JOIN users to resolve `actor_name` for the frontend timeline.
 * Mirrors goods_receipt_status_logs exactly.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_return_status_logs', {
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

  pgm.createIndex('purchase_return_status_logs', 'purchase_return_id');
  pgm.createIndex('purchase_return_status_logs', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_return_status_logs');
};
