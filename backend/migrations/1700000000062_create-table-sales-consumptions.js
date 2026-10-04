/* eslint-disable camelcase */

/**
 * Migration: sales_consumptions (POS / Sales Fase 2, doc 51 §4.7)
 *
 * Snapshot of exactly which batch was cut (and how much) for each sold item at
 * PAID time — one row per FEFO allocation. product_id is the consumed product:
 *   MADE_TO_ORDER -> an ingredient or topping product;
 *   STOCK         -> the sellable product itself.
 *
 * This is CRUCIAL for Fase 3 refund (SALE_RETURN): the full-order refund
 * returns each qty_consumed to its original batch_id (doc 51 §8). movement_id
 * links to the posted SALE ledger row for traceability (doc 35 §8).
 *
 * Company-scoped + outlet-scoped (doc 35 §3.1).
 */
exports.up = (pgm) => {
  pgm.createTable('sales_consumptions', {
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
    sales_order_id: {
      type: 'UUID',
      notNull: true,
      references: '"sales_orders"',
      onDelete: 'CASCADE',
    },
    sales_order_item_id: {
      type: 'UUID',
      notNull: true,
      references: '"sales_order_items"',
      onDelete: 'CASCADE',
    },
    // Consumed product: ingredient / topping (MADE_TO_ORDER) or sellable (STOCK).
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    batch_id: {
      type: 'UUID',
      notNull: true,
      references: '"inventory_batches"',
      onDelete: 'RESTRICT',
    },
    qty_consumed: {
      type: 'NUMERIC(18,3)',
      notNull: true,
    },
    movement_id: {
      type: 'UUID',
      notNull: true,
      references: '"inventory_movements"',
      onDelete: 'RESTRICT',
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'sales_consumptions',
    'sales_consumptions_qty_positive',
    'CHECK (qty_consumed > 0)',
  );

  pgm.createIndex('sales_consumptions', 'company_id');
  pgm.createIndex('sales_consumptions', 'sales_order_id');
  pgm.createIndex('sales_consumptions', 'sales_order_item_id');
  pgm.createIndex('sales_consumptions', 'batch_id');
  pgm.createIndex('sales_consumptions', 'movement_id');
};

exports.down = (pgm) => {
  pgm.dropTable('sales_consumptions');
};
