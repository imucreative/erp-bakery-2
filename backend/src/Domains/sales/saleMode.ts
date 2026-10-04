/**
 * Sale mode per sold item (POS / Sales — doc 51 §3, OQ-3).
 *
 *   MADE_TO_ORDER — the sellable product has an ACTIVE recipe; at PAID the
 *                   backflush consumes its ingredients (+ selected toppings)
 *                   via FEFO. Toppings only apply to this mode (§3.4).
 *   STOCK         — a FINISHED_GOODS product with stock and no ACTIVE recipe;
 *                   at PAID the product's own finished-goods stock is cut via
 *                   FEFO. No toppings.
 *
 * The mode is resolved deterministically from data at checkout (§3.0) and
 * snapshotted on the sales order item (sale_mode) for reproducibility.
 */
export const SALE_MODES = ['MADE_TO_ORDER', 'STOCK'] as const;

export type SaleMode = (typeof SALE_MODES)[number];

export function isSaleMode(value: unknown): value is SaleMode {
  return typeof value === 'string' && (SALE_MODES as readonly string[]).includes(value);
}
