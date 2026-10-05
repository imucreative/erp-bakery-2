/* eslint-disable camelcase */

/**
 * Migration: products.has_toppings (POS / Sales Fase 6a, doc 51 §2.1/§4.5a/§5.0)
 *
 * Boolean flag on the product master. When TRUE and the product is sold in
 * MADE_TO_ORDER mode, POS shows ALL active entries from the GLOBAL topping
 * catalog (`toppings`). When FALSE, the product has no toppings. The flag has
 * no effect on STOCK-mode products (§3.4 — toppings are rejected for STOCK).
 *
 * Defaults to FALSE so existing products keep their current behaviour.
 */
exports.up = (pgm) => {
  pgm.addColumn('products', {
    has_toppings: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('products', 'has_toppings');
};
