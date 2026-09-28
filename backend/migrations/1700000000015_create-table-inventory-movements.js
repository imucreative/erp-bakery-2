/* eslint-disable camelcase */

/**
 * Migration: inventory_movements
 *
 * Immutable inventory ledger (domain rule #9). Historical rows are never
 * edited or deleted; corrections require counter/reversal transactions.
 *
 * Every stock mutation appends exactly one row here, committed atomically
 * with the inventory_batches balance change (domain rule #6).
 *
 * A deterministic source key (source_document_type + source_document_id +
 * source_document_item_id + source_document_allocation_id) enforces posting
 * idempotency (domain rule #5) via a partial unique index.
 */
exports.up = (pgm) => {
  pgm.createTable('inventory_movements', {
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
    batch_id: {
      type: 'UUID',
      notNull: true,
      references: '"inventory_batches"',
      onDelete: 'RESTRICT',
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    movement_type: {
      type: 'VARCHAR(24)',
      notNull: true,
    },
    // Signed convention: qty is always positive; direction is implied by type.
    // before_qty / after_qty are authoritative batch balance snapshots.
    qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    before_qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    after_qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    // Deterministic source keys for idempotency + auditable reversal
    source_document_type: {
      type: 'VARCHAR(40)',
      notNull: false,
    },
    source_document_id: {
      type: 'UUID',
      notNull: false,
    },
    source_document_item_id: {
      type: 'UUID',
      notNull: false,
    },
    source_document_allocation_id: {
      type: 'UUID',
      notNull: false,
    },
    notes: {
      type: 'TEXT',
      notNull: false,
    },
    user_id: {
      type: 'UUID',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Movement type whitelist. ADJUSTMENT_IN/OUT are the executable adjustment
  // types (domain rule #22); legacy ADJUSTMENT & OPNAME kept for diagnostic
  // history only (rules #22, #25) and must not be used for new posting.
  pgm.addConstraint(
    'inventory_movements',
    'inventory_movements_type_check',
    `CHECK (movement_type IN (
      'PURCHASE','PRODUCTION_CONSUME','PRODUCTION_RESULT','SALE','RETURN',
      'TRANSFER_OUT','TRANSFER_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT',
      'ADJUSTMENT','OPNAME','EXPIRED'
    ))`,
  );

  pgm.addConstraint(
    'inventory_movements',
    'inventory_movements_qty_positive',
    'CHECK (qty > 0)',
  );

  pgm.createIndex('inventory_movements', 'company_id');
  pgm.createIndex('inventory_movements', 'outlet_id');
  pgm.createIndex('inventory_movements', 'batch_id');
  pgm.createIndex('inventory_movements', 'product_id');
  pgm.createIndex('inventory_movements', 'movement_type');
  pgm.createIndex('inventory_movements', 'created_at');

  // Idempotency: a given source allocation may post at most once.
  // Partial index so rows without a source key are unconstrained.
  pgm.sql(`
    CREATE UNIQUE INDEX inventory_movements_source_key_unique
    ON inventory_movements (
      source_document_type,
      source_document_id,
      COALESCE(source_document_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(source_document_allocation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE source_document_type IS NOT NULL AND source_document_id IS NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('inventory_movements');
};
