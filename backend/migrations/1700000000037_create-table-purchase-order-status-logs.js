/* eslint-disable camelcase */

/**
 * Migration: purchase_order_status_logs (approval timeline)
 *
 * Append-only trail of every status transition for a Purchase Order
 * (doc 35 §4 audit, doc 26 §5 lifecycle). One row per transition:
 * create (null -> DRAFT), submit, approve, reject, cancel, and resubmit
 * (REJECTED -> DRAFT). `note` carries the optional actor comment (mandatory
 * for reject, enforced at the use-case layer).
 *
 * Detail queries JOIN users to resolve `actor_name` for the frontend timeline.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_order_status_logs', {
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

  pgm.createIndex('purchase_order_status_logs', 'purchase_order_id');
  pgm.createIndex('purchase_order_status_logs', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_order_status_logs');
};
