/* eslint-disable camelcase */

/**
 * Migration: inventory_batches
 *
 * Outlet-native stock balance per batch/lot (NO warehouse layer).
 * Batch identity business key: outlet + product + batch_number + lot_key
 * (lot_key = normalized nullable-safe lotNumber; empty lot => '').
 *
 * qty_available is the authoritative Stock-On-Hand source (domain rule #8).
 * Every mutation to qty_available must commit atomically with an
 * inventory_movements ledger row (domain rule #6).
 */
exports.up = (pgm) => {
  pgm.createTable('inventory_batches', {
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
    outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'RESTRICT',
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    batch_number: {
      type: 'VARCHAR(60)',
      notNull: true,
    },
    // Normalized lot key: '' when no lot, so the unique key is deterministic
    lot_key: {
      type: 'VARCHAR(60)',
      notNull: true,
      default: '',
    },
    lot_number: {
      type: 'VARCHAR(60)',
      notNull: false,
    },
    expired_date: {
      type: 'DATE',
      notNull: true,
      comment: 'Required — batches that create stock must have expiry (domain rule #10)',
    },
    received_date: {
      type: 'DATE',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    qty_available: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
      comment: 'Authoritative Stock-On-Hand balance (domain rule #8)',
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'ACTIVE',
    },
    // TRUE for synthetic non-batch products (displayed as NOT_APPLICABLE)
    is_non_batch: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Batch/Lot business key (domain rule #11)
  pgm.addConstraint(
    'inventory_batches',
    'inventory_batches_outlet_product_batch_lot_key',
    'UNIQUE (outlet_id, product_id, batch_number, lot_key)',
  );

  // Batch status enum
  pgm.addConstraint(
    'inventory_batches',
    'inventory_batches_status_check',
    "CHECK (status IN ('ACTIVE','EXPIRED','CONSUMED','QUARANTINE'))",
  );

  // Negative stock ban at the database layer (domain rule #2)
  pgm.addConstraint(
    'inventory_batches',
    'inventory_batches_qty_non_negative',
    'CHECK (qty_available >= 0)',
  );

  pgm.createIndex('inventory_batches', 'company_id');
  pgm.createIndex('inventory_batches', 'outlet_id');
  pgm.createIndex('inventory_batches', 'product_id');
  pgm.createIndex('inventory_batches', 'expired_date');
  pgm.createIndex('inventory_batches', 'status');
  // Composite index to accelerate FEFO picks: active stock of a product at an
  // outlet ordered by nearest expiry.
  pgm.createIndex('inventory_batches', ['outlet_id', 'product_id', 'status', 'expired_date']);
};

exports.down = (pgm) => {
  pgm.dropTable('inventory_batches');
};
