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
 * business validation (RECIPE.NO_ACTIVE_RECIPE / TOPPING.NOT_ALLOWED) is thrown
 * from here as domain error codes.
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

/** A sellable product row for the POS grid, with its resolved mode + toppings. */
export interface PosProduct {
  productId: string;
  sku: string;
  name: string;
  productType: string;
  sellingPrice: number;
  saleMode: SaleMode;
  recipeId: string | null;
  toppings: PosToppingOption[];
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
   * Resolve checkout items deterministically (doc 51 §3.0 / §7.1):
   *   ACTIVE recipe -> MADE_TO_ORDER (snapshot recipe_id);
   *   else FINISHED_GOODS -> STOCK;
   *   else reject RECIPE.NO_ACTIVE_RECIPE.
   * Validates toppings per mode (TOPPING.NOT_ALLOWED), snapshots prices from
   * products.selling_price + product_toppings.extra_price (anti-tamper), and
   * computes each line_total. Pure resolution: no stock touched, no persist.
   */
  abstract resolveCheckoutItems(
    companyId: string,
    items: CheckoutItemRequest[],
  ): Promise<ResolveCheckoutResult>;

  /** Checkout — create a PENDING_PAYMENT order (+ items + toppings). No stock. */
  abstract createOrder(companyId: string, data: NewSalesOrderData): Promise<SalesOrder>;

  /**
   * Pay — PENDING_PAYMENT -> PAID. ATOMIC (SERIALIZABLE):
   *   lock order, assert PENDING_PAYMENT, Σ payments == grand_total, build
   *   consumption per item (MADE_TO_ORDER recipe+toppings / STOCK self), FEFO
   *   cut across batches, post SALE movements, snapshot consumptions, insert
   *   payments, flip to PAID. Insufficient stock -> rollback all.
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

  /** POS product grid — sellable products + resolved mode + available toppings. */
  abstract listPosProducts(
    companyId: string,
    filter: PosProductFilter,
  ): Promise<PosProductResult>;

  /** Toppings offered on a sellable product (active rows only). */
  abstract listProductToppings(
    productId: string,
    companyId: string,
  ): Promise<PosToppingOption[]>;
}
