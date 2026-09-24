/* eslint-disable camelcase */

/**
 * Migration: permissions
 * Granular permission codes following <domain>.<module>.<action> convention.
 * Platform-wide — not scoped per company.
 */
exports.up = (pgm) => {
  pgm.createTable('permissions', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    code: {
      type: 'VARCHAR(100)',
      notNull: true,
      unique: true,
    },
    name: {
      type: 'VARCHAR(150)',
      notNull: true,
    },
    domain: {
      type: 'VARCHAR(50)',
      notNull: false,
      comment: 'Business domain: system-administration, master-data, procurement, etc.',
    },
    module_key: {
      type: 'VARCHAR(50)',
      notNull: false,
      comment: 'Module identifier: user, product, purchase-request, etc.',
    },
    module_name: {
      type: 'VARCHAR(100)',
      notNull: false,
    },
    action: {
      type: 'VARCHAR(50)',
      notNull: false,
      comment: 'Action: read, manage, create, update, approve, complete, etc.',
    },
    sort_order: {
      type: 'INTEGER',
      notNull: false,
      default: 0,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('permissions', 'code');
  pgm.createIndex('permissions', 'domain');
  pgm.createIndex('permissions', 'module_key');
};

exports.down = (pgm) => {
  pgm.dropTable('permissions');
};
