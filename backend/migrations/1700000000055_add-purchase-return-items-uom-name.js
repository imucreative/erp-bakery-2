/* eslint-disable camelcase */

/**
 * Migration: purchase_return_items.uom_name
 *
 * UOM Snapshot (doc 26 §3 "UOM Snapshot"). Purchase Return lines already carry
 * uom_code (uoms.code); the UI needs the human-readable UOM NAME (uoms.name).
 * We store uom_name alongside uom_code so an old document detail stays accurate
 * even if the master UOM name changes later — exactly like the other product/
 * uom/batch snapshot columns on this table.
 *
 * Added NULLABLE first so existing rows stay valid (dev data; no production
 * rows). Existing rows are backfilled from uoms.name via the snapshot uom_id so
 * historical detail reads a real name instead of null. New rows are always
 * written with the server-derived snapshot by the create flow.
 *
 * exports.down drops the column.
 */
exports.up = (pgm) => {
  pgm.addColumn('purchase_return_items', {
    uom_name: {
      type: 'VARCHAR(100)',
      notNull: false,
    },
  });

  // Backfill existing rows from the snapshot uom_id (dev-data safety; no-op when
  // the table is empty).
  pgm.sql(`
    UPDATE purchase_return_items pri
    SET uom_name = u.name
    FROM uoms u
    WHERE u.id = pri.uom_id
      AND pri.uom_name IS NULL
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('purchase_return_items', 'uom_name');
};
