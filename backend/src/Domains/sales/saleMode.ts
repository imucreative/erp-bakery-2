/**
 * Sale mode per sold item (POS / Sales — doc 51 §3, OQ-3).
 *
 *   MADE_TO_ORDER — the line is fulfilled by BACKFLUSHING the recipe: at PAID
 *                   the recipe's ingredients are consumed via FEFO (producing
 *                   the item at the moment of sale). POS itself never decides
 *                   this from the product merely HAVING a recipe: since
 *                   checkout became stock-first, the resolver (which has no
 *                   recipe fallback) only produces STOCK, or rejects the line.
 *                   The mode therefore remains meaningful for orders already
 *                   persisted with it — the snapshot is what pay() reads back
 *                   to rebuild the consumption plan (and what refund() and
 *                   reporting rely on).
 *   STOCK         — the line is cut from the sellable finished-goods stock at
 *                   the outlet: at PAID the product's own stock is consumed via
 *                   FEFO. A line that stock cannot cover is rejected at
 *                   checkout (SALES_ORDER.STOCK_EXPIRED when the only stock is
 *                   expired, else INVENTORY.INSUFFICIENT_STOCK), never
 *                   downgraded to MADE_TO_ORDER.
 *
 * Toppings are INDEPENDENT of the mode: they are consumed in BOTH modes at
 * pay() (qty_per_item × item.qty per selected topping). Whether a product
 * accepts toppings at all is the separate has_toppings capability flag
 * (see Products), not a property of the mode.
 *
 * The mode is snapshotted on the sales order item (sale_mode) so the
 * consumption plan is reproducible and refund can reverse it exactly.
 */
export const SALE_MODES = ['MADE_TO_ORDER', 'STOCK'] as const;

export type SaleMode = (typeof SALE_MODES)[number];

export function isSaleMode(value: unknown): value is SaleMode {
  return typeof value === 'string' && (SALE_MODES as readonly string[]).includes(value);
}
