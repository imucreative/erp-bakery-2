/* eslint-disable camelcase */

/**
 * Migration: audit_logs
 * Immutable audit trail for all write operations across the ERP.
 * Never updated or soft-deleted — append-only.
 */
exports.up = (pgm) => {
  pgm.createTable('audit_logs', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'UUID',
      notNull: false, // NULL for SUPER_ADMIN platform-level actions
    },
    user_id: {
      type: 'UUID',
      notNull: false, // NULL for system-generated actions
    },
    module: {
      type: 'VARCHAR(100)',
      notNull: true,
      comment: 'e.g. users, companies, products, sales',
    },
    action: {
      type: 'VARCHAR(50)',
      notNull: true,
      comment: 'e.g. CREATE, UPDATE, DELETE, APPROVE, REJECT',
    },
    entity_id: {
      type: 'UUID',
      notNull: false,
      comment: 'ID of the affected record',
    },
    old_value: {
      type: 'JSONB',
      notNull: false,
    },
    new_value: {
      type: 'JSONB',
      notNull: false,
    },
    ip_address: {
      type: 'VARCHAR(50)',
      notNull: false,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('audit_logs', 'company_id');
  pgm.createIndex('audit_logs', 'user_id');
  pgm.createIndex('audit_logs', 'module');
  pgm.createIndex('audit_logs', 'action');
  pgm.createIndex('audit_logs', 'entity_id');
  pgm.createIndex('audit_logs', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('audit_logs');
};
