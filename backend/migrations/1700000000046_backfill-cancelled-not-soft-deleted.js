/* eslint-disable camelcase */

/**
 * Migration: backfill CANCELLED procurement documents to be visible again
 * (Opsi A, 2026-10-02).
 *
 * Background. Until 2026-10-02 the cancel action on Purchase Request, Purchase
 * Order and Goods Receipt set `status = 'CANCELLED'` AND `deleted_at = NOW()`
 * at the same time (soft-delete). Because every list/detail query filters on
 * `deleted_at IS NULL`, those CANCELLED documents disappeared from the UI.
 *
 * The approved decision (Opsi A) is that CANCELLED is a terminal BUSINESS
 * status that must stay visible; `deleted_at` is reserved for genuine
 * hard-delete. The repository cancel paths no longer write `deleted_at`.
 *
 * This migration repairs the already-cancelled rows that were soft-deleted
 * under the old behaviour so they reappear. It only clears the soft-delete
 * marker (deleted_at / deleted_by) for rows that are BOTH:
 *   - status = 'CANCELLED', AND
 *   - deleted_at IS NOT NULL
 *
 * It is deliberately:
 *   - company-agnostic (every company / tenant is covered — no company filter);
 *   - idempotent (re-running matches nothing once the rows are cleared);
 *   - scoped (non-CANCELLED rows, and genuinely hard-deleted non-CANCELLED
 *     rows, are never touched).
 *
 * The outstanding/consumption math was always driven by STATUS, not deleted_at
 * (see getConsumedQtyByPoItem / getConsumedQtyByPrItem), so unhiding these rows
 * does not change any quota calculation — CANCELLED is excluded there by status.
 */

const TABLES = ['purchase_requests', 'purchase_orders', 'goods_receipts'];

exports.up = (pgm) => {
  for (const table of TABLES) {
    pgm.sql(`
      UPDATE ${table}
      SET deleted_at = NULL,
          deleted_by = NULL
      WHERE status = 'CANCELLED'
        AND deleted_at IS NOT NULL;
    `);
  }
};

/**
 * down is intentionally a no-op.
 *
 * Re-applying `deleted_at` on CANCELLED rows would hide them again, which is
 * exactly the broken behaviour this migration repairs — undesirable even on a
 * rollback. Rolling back the code (restoring the old cancel behaviour) does not
 * require re-hiding historical documents, and we must never destroy/obscure
 * data on a down migration. So down does nothing.
 */
exports.down = () => {
  // No-op by design: see the note above. We never re-hide CANCELLED documents.
};
