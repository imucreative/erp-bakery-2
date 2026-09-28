/* eslint-disable camelcase */

/**
 * Migration: production_orders (header)
 *
 * Converts ingredients into finished goods via a recipe (production-domain §5).
 * Lifecycle: SCHEDULED -> IN_PROGRESS -> YIELD_COMPLETED -> QA_PASSED|QA_FAILED -> COMPLETED
 *   with SCHEDULED -> CANCELLED allowed.
 *
 * Stock is mutated ONLY on COMPLETED (backflushing, rule #2): ingredients are
 * consumed via FEFO (PRODUCTION_CONSUME) and finished goods are produced as a
 * new InventoryBatch (PRODUCTION_RESULT).
 */
exports.up = (pgm) => {
  pgm.createTable('production_orders', {
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
    production_number: {
      type: 'VARCHAR(30)',
      notNull: true,
      comment: 'PRD-YYYY-NNNNNN',
    },
    recipe_id: {
      type: 'UUID',
      notNull: true,
      references: '"recipes"',
      onDelete: 'RESTRICT',
    },
    // Finished product (denormalised from recipe for stable reference)
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    // Scale multiplier applied to recipe (scheduled_qty / recipe.yield_qty)
    scale_factor: {
      type: 'NUMERIC(18,6)',
      notNull: true,
      default: 1,
    },
    scheduled_qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      comment: 'Planned finished goods quantity',
    },
    actual_qty: {
      type: 'NUMERIC(18,3)',
      notNull: false,
      comment: 'Actual produced quantity (recorded at yield)',
    },
    waste_qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
    },
    production_date: {
      type: 'DATE',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    // Expiry for the finished-goods batch (required to create stock, rule #10)
    result_expired_date: {
      type: 'DATE',
      notNull: false,
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'SCHEDULED',
    },
    qa_notes: {
      type: 'TEXT',
      notNull: false,
    },
    notes: {
      type: 'TEXT',
      notNull: false,
    },
    // Link to the finished-goods batch created on completion
    result_batch_id: {
      type: 'UUID',
      notNull: false,
      references: '"inventory_batches"',
      onDelete: 'SET NULL',
    },
    created_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    started_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    completed_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    started_at: { type: 'TIMESTAMP', notNull: false },
    yield_at: { type: 'TIMESTAMP', notNull: false },
    qa_at: { type: 'TIMESTAMP', notNull: false },
    completed_at: { type: 'TIMESTAMP', notNull: false },
    cancelled_at: { type: 'TIMESTAMP', notNull: false },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'production_orders',
    'production_orders_number_company_unique',
    'UNIQUE (production_number, company_id)',
  );

  pgm.addConstraint(
    'production_orders',
    'production_orders_status_check',
    "CHECK (status IN ('SCHEDULED','IN_PROGRESS','YIELD_COMPLETED','QA_PASSED','QA_FAILED','COMPLETED','CANCELLED'))",
  );

  pgm.addConstraint(
    'production_orders',
    'production_orders_scheduled_positive',
    'CHECK (scheduled_qty > 0)',
  );

  pgm.createIndex('production_orders', 'company_id');
  pgm.createIndex('production_orders', 'outlet_id');
  pgm.createIndex('production_orders', 'recipe_id');
  pgm.createIndex('production_orders', 'product_id');
  pgm.createIndex('production_orders', 'status');
  pgm.createIndex('production_orders', 'production_number');
  pgm.createIndex('production_orders', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('production_orders');
};
