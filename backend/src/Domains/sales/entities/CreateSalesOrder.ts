/**
 * Domain Entity: CreateSalesOrder — validates the checkout payload (doc 51 §7.1).
 *
 * Shape (server computes all money — anti-tamper #5):
 *   {
 *     outletId: uuid,
 *     shiftId: uuid,
 *     customerName?: string,
 *     orderDiscount?: number >= 0,
 *     items: [{
 *       productId: uuid,
 *       qty: number > 0,
 *       itemDiscount?: number >= 0,
 *       toppings?: [{ toppingProductId: uuid }]
 *     }]
 *   }
 *
 * This entity validates STRUCTURE and basic numeric sanity only. Business
 * resolution (mode detection, topping allow-list, price snapshot, totals) is
 * done in CreateSalesOrderUseCase against the repository.
 */
export interface CreateSalesOrderToppingInput {
  toppingProductId: string;
}

export interface CreateSalesOrderItemInput {
  productId: string;
  qty: number;
  itemDiscount: number;
  toppings: CreateSalesOrderToppingInput[];
}

export class CreateSalesOrder {
  public readonly outletId: string;
  public readonly shiftId: string;
  public readonly customerName: string | null;
  public readonly orderDiscount: number;
  public readonly items: CreateSalesOrderItemInput[];

  constructor(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_SALES_ORDER.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;

    if (typeof p.outletId !== 'string' || typeof p.shiftId !== 'string') {
      throw new Error('CREATE_SALES_ORDER.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (!Array.isArray(p.items) || p.items.length === 0) {
      throw new Error('CREATE_SALES_ORDER.ITEMS_REQUIRED');
    }

    const orderDiscount = p.orderDiscount === undefined || p.orderDiscount === null
      ? 0
      : p.orderDiscount;
    if (typeof orderDiscount !== 'number' || !Number.isFinite(orderDiscount)) {
      throw new Error('CREATE_SALES_ORDER.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (orderDiscount < 0) {
      throw new Error('CREATE_SALES_ORDER.DISCOUNT_MUST_BE_NON_NEGATIVE');
    }

    const items: CreateSalesOrderItemInput[] = p.items.map((raw) => {
      if (!raw || typeof raw !== 'object') {
        throw new Error('CREATE_SALES_ORDER.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      const item = raw as Record<string, unknown>;

      if (typeof item.productId !== 'string') {
        throw new Error('CREATE_SALES_ORDER.ITEM_PRODUCT_REQUIRED');
      }
      if (
        item.qty === undefined ||
        item.qty === null ||
        typeof item.qty !== 'number' ||
        !Number.isFinite(item.qty)
      ) {
        throw new Error('CREATE_SALES_ORDER.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (item.qty <= 0) {
        throw new Error('CREATE_SALES_ORDER.ITEM_QTY_MUST_BE_POSITIVE');
      }

      const itemDiscount = item.itemDiscount === undefined || item.itemDiscount === null
        ? 0
        : item.itemDiscount;
      if (typeof itemDiscount !== 'number' || !Number.isFinite(itemDiscount)) {
        throw new Error('CREATE_SALES_ORDER.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (itemDiscount < 0) {
        throw new Error('CREATE_SALES_ORDER.DISCOUNT_MUST_BE_NON_NEGATIVE');
      }

      let toppings: CreateSalesOrderToppingInput[] = [];
      if (item.toppings !== undefined && item.toppings !== null) {
        if (!Array.isArray(item.toppings)) {
          throw new Error('CREATE_SALES_ORDER.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
        }
        toppings = item.toppings.map((t) => {
          if (!t || typeof t !== 'object') {
            throw new Error('CREATE_SALES_ORDER.TOPPING_NOT_MEET_DATA_TYPE_SPECIFICATION');
          }
          const topping = t as Record<string, unknown>;
          if (typeof topping.toppingProductId !== 'string') {
            throw new Error('CREATE_SALES_ORDER.TOPPING_PRODUCT_REQUIRED');
          }
          return { toppingProductId: topping.toppingProductId };
        });
      }

      return {
        productId: item.productId,
        qty: item.qty,
        itemDiscount,
        toppings,
      };
    });

    this.outletId = p.outletId;
    this.shiftId = p.shiftId;
    this.customerName = p.customerName ? String(p.customerName).trim() : null;
    this.orderDiscount = orderDiscount;
    this.items = items;
  }
}
