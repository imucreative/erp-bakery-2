/* eslint-disable camelcase */

/**
 * Migration: stock_transfers (header)
 *
 * Inter-outlet stock movement (inventory-domain rules #16-#18).
 * Lifecycle: DRAFT -> SUBMITTED -> IN_TRANSIT -> COMPLETED
 *   with DRAFT -> CANCELLED and SUBMITTED -> CANCELLED allowed.
 *
 * SUBMITTED locks the document without moving stock.
 * Dispatch (SUBMITTED -> IN_TRANSIT) creates TRANSFER_OUT at source.
 * Receive (IN_TRANSIT -> COMPLETED) creates TRANSFER_IN at destination.
 * In-transit stock is not available at either outlet.
 */
exports.up = (pgm) => {
  pgm.createTable('stock_transfers', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'UUID',
      notNull: true,
      references: '"companies"',
      onDelete: 'CASCADE',
    },
    source_outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'RESTRICT',
    },
    destination_outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'RESTRICT',
    },
    transfer_number: {
      type: 'VARCHAR(30)',
      notNull: true,
      comment: 'TRF-YYYY-NNNNNN',
    },
    transfer_date: {
      type: 'DATE',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'DRAFT',
    },
    notes: {
      type: 'TEXT',
      notNull: false,
    },
    created_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    submitted_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    dispatched_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    received_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    submitted_at: { type: 'TIMESTAMP', notNull: false },
    dispatched_at: { type: 'TIMESTAMP', notNull: false },
    received_at: { type: 'TIMESTAMP', notNull: false },
    cancelled_at: { type: 'TIMESTAMP', notNull: false },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'stock_transfers',
    'stock_transfers_number_company_unique',
    'UNIQUE (transfer_number, company_id)',
  );

  pgm.addConstraint(
    'stock_transfers',
    'stock_transfers_status_check',
    "CHECK (status IN ('DRAFT','SUBMITTED','IN_TRANSIT','COMPLETED','CANCELLED'))",
  );

  // Source and destination must differ
  pgm.addConstraint(
    'stock_transfers',
    'stock_transfers_source_dest_diff',
    'CHECK (source_outlet_id <> destination_outlet_id)',
  );

  pgm.createIndex('stock_transfers', 'company_id');
  pgm.createIndex('stock_transfers', 'source_outlet_id');
  pgm.createIndex('stock_transfers', 'destination_outlet_id');
  pgm.createIndex('stock_transfers', 'status');
  pgm.createIndex('stock_transfers', 'transfer_number');
  pgm.createIndex('stock_transfers', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('stock_transfers');
};
