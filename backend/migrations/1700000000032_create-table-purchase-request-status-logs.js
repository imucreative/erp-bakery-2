/* eslint-disable camelcase */

/**
 * Migration: purchase_request_status_logs (approval timeline)
 *
 * Append-only trail of every status transition for a Purchase Request
 * (doc 43 §5 audit logging, doc 35 §6 comment categories). One row per
 * transition: create (null -> DRAFT), submit, approve, reject, cancel, and
 * resubmit (REJECTED -> DRAFT). `note` carries the optional actor comment
 * (mandatory for reject is enforced at the use-case layer).
 *
 * This table is reusable in spirit for future document modules (PO/GR/Return).
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_request_status_logs', {
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

  pgm.createIndex('purchase_request_status_logs', 'purchase_request_id');
  pgm.createIndex('purchase_request_status_logs', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_request_status_logs');
};
