import { SalesOrderStatus } from '../salesOrderStatus';
import { SaleMode } from '../saleMode';
import { PaymentMethod } from '../paymentMethod';

/**
 * Read value objects for the Sales module (POS / Sales — doc 51 §4).
 * These are plain data holders returned by the repository; validation of
 * inbound payloads lives in CreateSalesOrder / the pay path.
 */

export interface SalesOrderItemTopping {
  id: string;
  toppingProductId: string;
  toppingNameSnapshot: string;
  qtyPerItem: number;
  extraPriceSnapshot: number;
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  saleMode: SaleMode;
  recipeId: string | null;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  qty: number;
  itemDiscount: number;
  toppingsPrice: number;
  lineTotal: number;
  toppings: SalesOrderItemTopping[];
}

export interface SalesPayment {
  id: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNo: string | null;
  paidAt: Date;
}

/**
 * Domain Entity: SalesOrder (read value object) — header + items (+toppings)
 * + payments. Consumptions are snapshotted separately (sales_consumptions) for
 * refund/audit and are not loaded on the standard order read.
 */
export class SalesOrder {
  public readonly id: string;
  public readonly companyId: string;
  public readonly outletId: string;
  public readonly outletName: string | null;
  public readonly shiftId: string;
  public readonly invoiceNumber: string;
  public readonly customerName: string | null;
  public readonly orderDate: Date;
  public readonly status: SalesOrderStatus;
  public readonly itemCount: number;
  public readonly subtotal: number;
  public readonly orderDiscount: number;
  public readonly tax: number;
  public readonly grandTotal: number;
  public readonly cashierUserId: string;
  public readonly cashierName: string | null;
  public readonly paidAt: Date | null;
  public readonly items: SalesOrderItem[];
  public readonly payments: SalesPayment[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    outletId: string;
    outletName: string | null;
    shiftId: string;
    invoiceNumber: string;
    customerName: string | null;
    orderDate: Date;
    status: SalesOrderStatus;
    itemCount: number;
    subtotal: number;
    orderDiscount: number;
    tax: number;
    grandTotal: number;
    cashierUserId: string;
    cashierName: string | null;
    paidAt: Date | null;
    items: SalesOrderItem[];
    payments: SalesPayment[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.outletId = payload.outletId;
    this.outletName = payload.outletName;
    this.shiftId = payload.shiftId;
    this.invoiceNumber = payload.invoiceNumber;
    this.customerName = payload.customerName;
    this.orderDate = payload.orderDate;
    this.status = payload.status;
    this.itemCount = payload.itemCount;
    this.subtotal = payload.subtotal;
    this.orderDiscount = payload.orderDiscount;
    this.tax = payload.tax;
    this.grandTotal = payload.grandTotal;
    this.cashierUserId = payload.cashierUserId;
    this.cashierName = payload.cashierName;
    this.paidAt = payload.paidAt;
    this.items = payload.items;
    this.payments = payload.payments;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
