/**
 * Read value objects for Sales Return / Refund (POS / Sales Fase 3 — doc 51 §4.8/§8).
 *
 * A SalesReturn is the full-order refund record (MVP: full-order only, OQ-4). It
 * is created in the terminal COMPLETED status, carries the refunded amount (=
 * the order grand_total), and links to one SalesReturnItem per refunded order
 * item. The stock reversal (SALE_RETURN inbound movements to the original
 * batches) is posted atomically with the refund in the repository.
 */

export type SalesReturnStatus = 'COMPLETED';

export interface SalesReturnItem {
  id: string;
  salesOrderItemId: string;
  qtyReturned: number;
  refundLineAmount: number;
}

export class SalesReturn {
  public readonly id: string;
  public readonly companyId: string;
  public readonly outletId: string;
  public readonly salesOrderId: string;
  public readonly reason: string | null;
  public readonly refundAmount: number;
  public readonly status: SalesReturnStatus;
  public readonly returnedBy: string | null;
  public readonly items: SalesReturnItem[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    outletId: string;
    salesOrderId: string;
    reason: string | null;
    refundAmount: number;
    status: SalesReturnStatus;
    returnedBy: string | null;
    items: SalesReturnItem[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.outletId = payload.outletId;
    this.salesOrderId = payload.salesOrderId;
    this.reason = payload.reason;
    this.refundAmount = payload.refundAmount;
    this.status = payload.status;
    this.returnedBy = payload.returnedBy;
    this.items = payload.items;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
