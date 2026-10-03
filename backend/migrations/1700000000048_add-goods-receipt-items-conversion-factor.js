/* eslint-disable camelcase */

/**
 * Migration: goods_receipt_items.conversion_factor
 *
 * UOM Conversion — TAHAP 2 (GR input multi-satuan, doc 50 §4/§5/§8, Keputusan #2/#4).
 *
 * Snapshots the per-line UOM conversion factor at GR create/update time (model
 * 2b SNAPSHOT). The factor relates the GR line's input unit (goods_receipt_items.uom_id,
 * inherited from the PO line — Keputusan #4: satuan PO = satuan GR) to the
 * product's BASE unit (products.uom_id):
 *
 *   baseQty = accepted_quantity * conversion_factor
 *
 * Posting (complete) consumes THIS snapshot (not the live master factor), so a
 * later change to product_uom_conversions never retroactively alters a GR that
 * was already drafted.
 *
 * DEFAULT 1 is the compatibility guarantee (doc 50 §5.3): existing rows and any
 * GR whose line uom IS the product base unit carry factor 1, so baseQty ==
 * accepted and inventory posting behaves EXACTLY as before T2. The feature is
 * additive and opt-in — stock/ledger/FEFO stay in the base unit; conversion
 * happens only at the single posting injection point.
 *
 * NUMERIC(18,6) matches product_uom_conversions.factor_to_base precision; the
 * resulting baseQty is rounded to NUMERIC(18,3) (the stock schema precision)
 * before posting. A separate base_uom column is intentionally NOT stored: the
 * input unit is already on the row (uom_id) and the base unit is derivable from
 * products.uom_id, so the factor alone is a sufficient, non-redundant snapshot.
 *
 * CHECK (> 0) mirrors the master-table constraint: a factor must be strictly
 * positive. Only forward-created rows are affected; the DEFAULT backfills all
 * existing rows to 1 atomically.
 */
exports.up = (pgm) => {
  pgm.addColumn('goods_receipt_items', {
    conversion_factor: {
      type: 'NUMERIC(18,6)',
      notNull: true,
      default: 1,
    },
  });

  pgm.addConstraint(
    'goods_receipt_items',
    'goods_receipt_items_conversion_factor_positive_check',
    'CHECK (conversion_factor > 0)',
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    'goods_receipt_items',
    'goods_receipt_items_conversion_factor_positive_check',
  );
  pgm.dropColumn('goods_receipt_items', 'conversion_factor');
};
