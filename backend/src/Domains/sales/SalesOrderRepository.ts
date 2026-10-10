import { SalesOrder } from './entities/SalesOrder';
import { SalesReturn } from './entities/SalesReturn';
import { SaleMode } from './saleMode';

/** Resolved item (mode + snapshots + validated toppings) ready to persist. */
export interface ResolvedSalesOrderItemTopping {
  toppingProductId: string;
  toppingNameSnapshot: string;
  qtyPerItem: number;
  extraPriceSnapshot: number;
}

export interface ResolvedSalesOrderItem {
  productId: string;
  saleMode: SaleMode;
  recipeId: string | null;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  qty: number;
  itemDiscount: number;
  toppingsPrice: number;
  lineTotal: number;
  toppings: ResolvedSalesOrderItemTopping[];
}

/** Fully-resolved checkout data (totals computed server-side) to persist. */
export interface NewSalesOrderData {
  outletId: string;
  shiftId: string;
  customerName: string | null;
  itemCount: number;
  subtotal: number;
  orderDiscount: number;
  tax: number;
  grandTotal: number;
  cashierUserId: string | null;
  items: ResolvedSalesOrderItem[];
}

export interface PaymentInput {
  method: string;
  amount: number;
  referenceNo: string | null;
}

/** A requested topping on a checkout item (pre-resolution). */
export interface CheckoutToppingRequest {
  toppingProductId: string;
}

/** A requested checkout item (pre-resolution). */
export interface CheckoutItemRequest {
  productId: string;
  qty: number;
  itemDiscount: number;
  toppings: CheckoutToppingRequest[];
}

/**
 * Deterministic mode resolution + snapshot data for the checkout items.
 * Returned fully resolved (mode, recipeId, price + topping snapshots, line
 * totals) so the use case only has to sum header totals and persist. All
 * business validation (SALES_ORDER.STOCK_EXPIRED / INVENTORY.INSUFFICIENT_STOCK
 * / TOPPING.NOT_ALLOWED) is thrown from here as domain error codes.
 */
export interface ResolveCheckoutResult {
  items: ResolvedSalesOrderItem[];
}

/** Result of a full-order refund: the REFUNDED order + the created return. */
export interface SalesRefundResult {
  order: SalesOrder;
  salesReturn: SalesReturn;
}

export interface SalesOrderListFilter {
  limit: number;
  offset: number;
  outletId?: string;
  shiftId?: string;
  status?: string;
  search?: string;
}

export interface SalesOrderListResult {
  rows: SalesOrder[];
  total: number;
}

/** A topping offered on a sellable product (POS grid / modifier panel). */
export interface PosToppingOption {
  toppingProductId: string;
  toppingName: string;
  defaultQtyPerItem: number;
  extraPrice: number;
  sortOrder: number;
}

/**
 * A sellable product row for the POS grid, with a `hasToppings` flag. The
 * topping LIST is global (doc 51 §2.1): the FE loads it once via
 * GET /sales/pos/toppings and shows the modifier panel for any product with
 * `hasToppings = true`.
 *
 * `saleMode` is a PRODUCT CAPABILITY, not the mode a checkout will use. It is
 * derived as `has an ACTIVE recipe` (→ `MADE_TO_ORDER`, i.e. the product can
 * be backflushed from its BOM) or not (→ `STOCK`), and exists so the FE can
 * decide whether the modifier panel is worth opening. The mode actually used
 * at checkout is resolved per line from the outlet's sellable stock by
 * `resolveCheckoutItems` — a topped line served from stock is cut as `STOCK`.
 *
 * `availableQty` is the sellable finished-goods stock on hand at the requested
 * outlet (sum of ACTIVE, qty > 0, non-expired batch balances; 0 when outletId
 * is absent or there is no stock). The POS grid displays it so cashiers see
 * what is sellable from stock.
 *
 * `expiredQty` is the stock that exists but is no longer sellable: ACTIVE
 * batches with qty > 0 whose expired_date is already past. It is scoped to the
 * same outlet and uses the same batch filters as the checkout resolver, so the
 * grid can explain *why* an item is not sellable (expired) instead of showing a
 * bare zero.
 */
export interface PosProduct {
  productId: string;
  sku: string;
  name: string;
  productType: string;
  sellingPrice: number;
  saleMode: SaleMode;
  recipeId: string | null;
  hasToppings: boolean;
  availableQty: number;
  expiredQty: number;
}

export interface PosProductFilter {
  limit: number;
  offset: number;
  outletId?: string;
  search?: string;
}

export interface PosProductResult {
  rows: PosProduct[];
  total: number;
}

/**
 * Abstract repository — Sales (POS) domain Fase 2 (doc 51). Company-scoped.
 *
 * The heavy money/stock transaction (pay) is owned by the repository: it runs
 * in ONE SERIALIZABLE transaction (FEFO batch deduction + SALE movements +
 * consumption snapshots + payments + status flip), mirroring the Production
 * instant-complete backflush path.
 */
export abstract class SalesOrderRepository {
  /**
   * Resolve checkout items deterministically (doc 51 §3.0 / §7.1). POS never
   * auto-backflushes raw materials — backflush only happens through a
   * Production Order — so there is exactly ONE rule for every line, topped or
   * not:
   *
   *  - Sellable finished-goods stock at the outlet covers qty -> STOCK
   *    (recipe_id stays null). The finished batch is cut at pay(); any topping
   *    is consumed on top of it.
   *  - Stock exists but none of it is sellable (all past expiry) -> rejected
   *    with SALES_ORDER.STOCK_EXPIRED, so the cashier is told the real reason
   *    instead of a bare shortage (the fix is a new Production Order).
   *  - No sellable stock at all (or not enough and nothing expired) ->
   *    rejected with INVENTORY.INSUFFICIENT_STOCK. There is NO recipe
   *    fallback, for a topped line either.
   *
   * Validates toppings against the GLOBAL topping catalog + the product's
   * has_toppings flag (TOPPING.NOT_ALLOWED — the only mode-independent gate),
   * snapshots prices from products.selling_price + toppings.extra_price
   * (anti-tamper), and computes each line_total. Pure resolution: no stock
   * touched, no persist.
   */
  abstract resolveCheckoutItems(
    companyId: string,
    outletId: string,
    items: CheckoutItemRequest[],
  ): Promise<ResolveCheckoutResult>;

  /** Checkout — create a PENDING_PAYMENT order (+ items + toppings). No stock. */
  abstract createOrder(companyId: string, data: NewSalesOrderData): Promise<SalesOrder>;

  /**
   * Pay — PENDING_PAYMENT -> PAID. ATOMIC (SERIALIZABLE):
   *   lock order, assert PENDING_PAYMENT, Σ payments == grand_total, build
   *   consumption per item (MADE_TO_ORDER recipe ingredients / STOCK self,
   *   plus the selected toppings in BOTH modes), FEFO cut across batches, post
   *   SALE movements, snapshot consumptions, insert payments, flip to PAID.
   *   Insufficient stock -> rollback all.
   */
  abstract pay(
    orderId: string,
    companyId: string,
    userId: string | null,
    payments: PaymentInput[],
  ): Promise<SalesOrder>;

  /** Void — PENDING_PAYMENT -> CANCELLED (no stock). */
  abstract void(orderId: string, companyId: string, userId: string | null): Promise<SalesOrder>;

  /**
   * Refund — PAID -> REFUNDED, full-order (doc 51 §8, OQ-4/OQ-5). ATOMIC
   * (SERIALIZABLE): lock the order, assert PAID (idempotency: an already
   * REFUNDED order is rejected), read every sales_consumptions row, return each
   * consumed qty to its ORIGINAL batch (reactivating CONSUMED batches), post a
   * SALE_RETURN inbound movement per slice, insert the sales_returns header +
   * items (refund_amount = grand_total), and flip the order to REFUNDED. A
   * duplicate SALE_RETURN source key (double refund) maps to
   * INVENTORY.DUPLICATE_MOVEMENT_SOURCE.
   */
  abstract refund(
    orderId: string,
    companyId: string,
    userId: string | null,
    reason: string | null,
  ): Promise<SalesRefundResult>;

  abstract getById(id: string, companyId: string): Promise<SalesOrder>;

  /** Latest sales return for an order (null if none), for order-detail display. */
  abstract getReturnByOrderId(
    orderId: string,
    companyId: string,
  ): Promise<SalesReturn | null>;

  abstract list(
    companyId: string,
    filter: SalesOrderListFilter,
  ): Promise<SalesOrderListResult>;

  /** POS product grid — sellable products + topping capability + hasToppings. */
  abstract listPosProducts(
    companyId: string,
    filter: PosProductFilter,
  ): Promise<PosProductResult>;

  /**
   * Active entries of the GLOBAL topping catalog for the POS modifier panel
   * (doc 51 §10 — GET /sales/pos/toppings). A single list shared by every
   * has_toppings product; no per-product scoping.
   */
  abstract listActiveToppings(companyId: string): Promise<PosToppingOption[]>;
}
