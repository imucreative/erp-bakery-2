/* eslint-disable camelcase */

/**
 * Migration: fix inventory_movements source-key idempotency to include movement_type
 *
 * The original migration (1700000000015) defined the partial unique index
 * `inventory_movements_source_key_unique` over:
 *   (source_document_type, source_document_id,
 *    COALESCE(source_document_item_id, '000...'::uuid),
 *    COALESCE(source_document_allocation_id, '000...'::uuid))
 *   WHERE source_document_type IS NOT NULL AND source_document_id IS NOT NULL
 *
 * This index did NOT include `movement_type`. Stock Transfer posts two rows for
 * the same source document item: `TRANSFER_OUT` on dispatch and `TRANSFER_IN`
 * on receive, both carrying the identical source key
 * (STOCK_TRANSFER, transferId, itemId) with a NULL allocation id. Because the
 * index ignored `movement_type`, the TRANSFER_IN row collided with the already
 * posted TRANSFER_OUT row (Postgres 23505) and surfaced as
 * `INVENTORY.DUPLICATE_MOVEMENT_SOURCE` on receive.
 *
 * Knowledge-base doc 35 §8 states the database must prevent duplicate posting
 * for the same source allocation AND movement type. This migration therefore
 * recreates the SAME-named unique index but with `movement_type` as the first
 * key column, keeping the COALESCE handling for item/allocation ids and the
 * identical partial WHERE clause.
 *
 * Effect: OUT and IN for the same transfer item no longer collide (different
 * movement_type), while each direction stays idempotent — replaying the same
 * dispatch (TRANSFER_OUT) or the same receive (TRANSFER_IN) is still rejected.
 *
 * The index name is intentionally preserved so repository code (which maps the
 * 23505 violation to INVENTORY.DUPLICATE_MOVEMENT_SOURCE) needs no change.
 */
exports.up = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS inventory_movements_source_key_unique');

  pgm.sql(`
    CREATE UNIQUE INDEX inventory_movements_source_key_unique
    ON inventory_movements (
      movement_type,
      source_document_type,
      source_document_id,
      COALESCE(source_document_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(source_document_allocation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE source_document_type IS NOT NULL AND source_document_id IS NOT NULL
  `);
};

exports.down = (pgm) => {
  // Revert to the legacy index shape (without movement_type).
  pgm.sql('DROP INDEX IF EXISTS inventory_movements_source_key_unique');

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
