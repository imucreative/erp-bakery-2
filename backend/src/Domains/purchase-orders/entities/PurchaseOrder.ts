import { PurchaseOrderStatus } from '../purchaseOrderStatus';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantity: number;
  uomId: string;
  unitPrice: number;
  /** Percentage tax, e.g. 11 means 11%. */
  taxPercent: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface PurchaseOrderStatusLog {
  id: string;
  fromStatus: PurchaseOrderStatus | null;
  toStatus: PurchaseOrderStatus;
  actorId: string | null;
  /** Resolved via LEFT JOIN to users (actor_id -> users.name); null if missing. */
  actorName: string | null;
  note: string | null;
  createdAt: Date;
}

/**
 * Domain Entity: PurchaseOrder (read value object) — header + items + timeline.
 *
 * Payment term fields are snapshots captured at create/update time so the
 * document stays readable when master data changes (doc 26 §6.5).
 * `estimatedPaymentDueDate` is backend-computed (doc 26 §6.4). Money totals are
 * server-computed sums of the line items (anti-tamper).
 */
export class PurchaseOrder {
  public readonly id: string;
  public readonly companyId: string;
  public readonly poNumber: string;
  public readonly purchaseRequestId: string;
  public readonly supplierId: string;
  public readonly destinationOutletId: string;
  public readonly orderDate: Date;
  public readonly paymentTermId: string | null;
  public readonly paymentTermCode: string | null;
  public readonly paymentTermName: string | null;
  public readonly paymentTermDueDays: number | null;
  public readonly estimatedPaymentDueDate: Date | null;
  public readonly totalAmount: number;
  public readonly taxTotal: number;
  public readonly grandTotal: number;
  public readonly status: PurchaseOrderStatus;
  public readonly notes: string | null;
  public readonly items: PurchaseOrderItem[];
  public readonly statusLogs: PurchaseOrderStatusLog[];
  public readonly approvedBy: string | null;
  public readonly approvedAt: Date | null;
  public readonly createdBy: string | null;
  public readonly updatedBy: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    poNumber: string;
    purchaseRequestId: string;
    supplierId: string;
    destinationOutletId: string;
    orderDate: Date;
    paymentTermId: string | null;
    paymentTermCode: string | null;
    paymentTermName: string | null;
    paymentTermDueDays: number | null;
    estimatedPaymentDueDate: Date | null;
    totalAmount: number;
    taxTotal: number;
    grandTotal: number;
    status: PurchaseOrderStatus;
    notes: string | null;
    items: PurchaseOrderItem[];
    statusLogs: PurchaseOrderStatusLog[];
    approvedBy: string | null;
    approvedAt: Date | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.poNumber = payload.poNumber;
    this.purchaseRequestId = payload.purchaseRequestId;
    this.supplierId = payload.supplierId;
    this.destinationOutletId = payload.destinationOutletId;
    this.orderDate = payload.orderDate;
    this.paymentTermId = payload.paymentTermId;
    this.paymentTermCode = payload.paymentTermCode;
    this.paymentTermName = payload.paymentTermName;
    this.paymentTermDueDays = payload.paymentTermDueDays;
    this.estimatedPaymentDueDate = payload.estimatedPaymentDueDate;
    this.totalAmount = payload.totalAmount;
    this.taxTotal = payload.taxTotal;
    this.grandTotal = payload.grandTotal;
    this.status = payload.status;
    this.notes = payload.notes;
    this.items = payload.items;
    this.statusLogs = payload.statusLogs;
    this.approvedBy = payload.approvedBy;
    this.approvedAt = payload.approvedAt;
    this.createdBy = payload.createdBy;
    this.updatedBy = payload.updatedBy;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
