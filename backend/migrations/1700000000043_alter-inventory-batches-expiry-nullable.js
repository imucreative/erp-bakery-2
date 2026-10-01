/* eslint-disable camelcase */

/**
 * Migration: make inventory_batches.expired_date NULLABLE
 *
 * Context (Goods Receipt Stage 2 — inventory posting):
 * Non-batch products that are received create a SYNTHETIC batch row
 * (batch_number = '', lot_key = '', is_non_batch = TRUE) that intentionally
 * has NO expiry. The read-side already supports this: InventoryBatch.expiredDate
 * is `Date | null` and batchStatus.classifyExpiry() returns NOT_APPLICABLE when
 * expiry is null (doc 27 #14/#15 show non-batch stock with expiry '-').
 *
 * The original schema declared expired_date NOT NULL (migration 014) because at
 * the time every batch that created stock was batch-tracked. The batch-expiry
 * requirement (domain rule #10) is now enforced in the DOMAIN layer only for
 * batch-tracked products with accepted > 0 (GOODS_RECEIPT.EXPIRY_REQUIRED), NOT
 * via a column constraint. A far-future sentinel date was explicitly rejected
 * because it would corrupt FEFO ordering and expiry dashboards.
 *
 * `down` restores NOT NULL for syntactic reversibility. WARNING: the down
 * migration is only safe when NO row has a NULL expired_date (i.e. no non-batch
 * stock has been posted). If synthetic non-batch rows exist, `SET NOT NULL`
 * will fail; those rows would have to be cleaned up first. We do NOT backfill a
 * sentinel in `down` on purpose — silently inventing an expiry date would be
 * worse than a loud failure.
 */
exports.up = (pgm) => {
  pgm.alterColumn('inventory_batches', 'expired_date', {
    notNull: false,
    comment:
      'Expiry date. NULL for synthetic non-batch rows (is_non_batch = TRUE). ' +
      'Batch-tracked stock still requires expiry — enforced in the domain layer.',
  });
};

exports.down = (pgm) => {
  // Reversible only when no NULL rows exist; see the file-level warning.
  pgm.alterColumn('inventory_batches', 'expired_date', {
    notNull: true,
    comment:
      'Required — batches that create stock must have expiry (domain rule #10)',
  });
};
