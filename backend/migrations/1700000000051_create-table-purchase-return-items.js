/* eslint-disable camelcase */

/**
 * Migration: purchase_return_items (lines)
 *
 * Each line returns (part of) ONE posted accepted Goods Receipt line/batch
 * (doc 26 §6 #14–#16). The authoritative returnable source is the posted
 * accepted inventory movement (movement_type = PURCHASE) that GR complete wrote
 * for that GR item — a GR item snapshot alone is NOT sufficient (doc 26 §6 #15).
 *
 * Source reference for the RETURN reversal (doc 26 §6 #16/#19, doc 35 §8):
 *   goods_receipt_item_id    — the source GR line.
 *   source_batch_id          — the InventoryBatch the GR PURCHASE movement
 *                              credited (= GR PURCHASE movement.batch_id). The
 *                              RETURN reversal decrements THIS exact batch.
 *   source_movement_id       — the GR PURCHASE inventory_movements row id used
 *                              as the reversal reference (doc 26 §6 #16).
 *
 * Quantity model (doc 26 §6 #16, all stored at submit/complete snapshot time):
 *   posted_accepted_quantity     — posted PURCHASE qty for the source GR
 *                                  item/batch (base-unit, read-only snapshot).
 *   previously_returned_quantity — qty already returned by COMPLETED returns of
 *                                  the same GR item/batch at creation time
 *                                  (snapshot, informational).
 *   return_quantity              — quantity being returned by THIS line (> 0).
 *   returnable (derived, NOT stored as the sole truth):
 *     posted_accepted − completed_returns − submitted_returns  (getReturnable).
 *
 * Product / UOM / batch / lot / expiry are SNAPSHOTS (doc 26 §3/§6 #16) so the
 * line stays readable even if the product or batch changes later.
 *
 * reason is a controlled value (doc 26 §6 #17); reason_description is MANDATORY
 * when reason = OTHER (enforced in the DTO + service, not the DB).
 *
 * ON DELETE CASCADE with the header so a hard-deleted header (tests only) cleans
 * its lines; normal flow soft-deletes/cancels the header.
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_return_items', {
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
    goods_receipt_item_id: {
      type: 'UUID',
      notNull: true,
      references: '"goods_receipt_items"',
      onDelete: 'RESTRICT',
    },
    // Source of the RETURN reversal (doc 26 §6 #16/#19, doc 35 §8).
    source_batch_id: {
      type: 'UUID',
      notNull: true,
      references: '"inventory_batches"',
      onDelete: 'RESTRICT',
    },
    source_movement_id: {
      type: 'UUID',
      notNull: true,
      references: '"inventory_movements"',
      onDelete: 'RESTRICT',
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    // Product/UOM/batch snapshots (doc 26 §3/§6 #16).
    product_sku: {
      type: 'VARCHAR(60)',
      notNull: true,
    },
    product_name: {
      type: 'VARCHAR(200)',
      notNull: true,
    },
    uom_id: {
      type: 'UUID',
      notNull: true,
      references: '"uoms"',
      onDelete: 'RESTRICT',
    },
    uom_code: {
      type: 'VARCHAR(60)',
      notNull: true,
    },
    batch_number: {
      type: 'VARCHAR(100)',
      notNull: false,
    },
    lot_number: {
      type: 'VARCHAR(100)',
      notNull: false,
    },
    expired_date: {
      type: 'DATE',
      notNull: false,
    },
    posted_accepted_quantity: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
    },
    previously_returned_quantity: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
    },
    return_quantity: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      default: 0,
    },
    reason: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    reason_description: {
      type: 'TEXT',
      notNull: false,
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'purchase_return_items',
    'purchase_return_items_return_qty_positive',
    'CHECK (return_quantity > 0)',
  );
  pgm.addConstraint(
    'purchase_return_items',
    'purchase_return_items_posted_non_negative',
    'CHECK (posted_accepted_quantity >= 0)',
  );
  pgm.addConstraint(
    'purchase_return_items',
    'purchase_return_items_prev_non_negative',
    'CHECK (previously_returned_quantity >= 0)',
  );
  pgm.addConstraint(
    'purchase_return_items',
    'purchase_return_items_reason_check',
    `CHECK (reason IN ('DAMAGED','WRONG_ITEM','QUALITY_ISSUE','EXPIRED','OVER_DELIVERY','OTHER'))`,
  );

  pgm.createIndex('purchase_return_items', 'purchase_return_id');
  pgm.createIndex('purchase_return_items', 'goods_receipt_item_id');
  pgm.createIndex('purchase_return_items', 'source_batch_id');
  pgm.createIndex('purchase_return_items', 'source_movement_id');
  pgm.createIndex('purchase_return_items', 'product_id');
  pgm.createIndex('purchase_return_items', 'uom_id');
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_return_items');
};
