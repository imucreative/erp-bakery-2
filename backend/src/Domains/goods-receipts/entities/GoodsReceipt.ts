import { GoodsReceiptStatus } from '../goodsReceiptStatus';

export interface GoodsReceiptItem {
  id: string;
  purchaseOrderItemId: string;
  productId: string;
  /** Snapshot of the source PO line quantity (read-only). */
  orderedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  uomId: string;
  batchNumber: string | null;
  lotNumber: string | null;
  expiryDate: Date | null;
}

export interface GoodsReceiptStatusLog {
  id: string;
  fromStatus: GoodsReceiptStatus | null;
  toStatus: GoodsReceiptStatus;
  actorId: string | null;
  /** Resolved via LEFT JOIN to users (actor_id -> users.name); null if missing. */
  actorName: string | null;
  note: string | null;
  createdAt: Date;
}

/**
 * Domain Entity: GoodsReceipt (read value object) — header + items + timeline.
 *
 * supplierId and destinationOutletId are snapshots inherited from the source PO
 * at create time (doc 26 §3). `inventoryPostedAt` is null in Stage 1 and is set
 * by Stage 2 when accepted quantities are posted to inventory (idempotency
 * marker, doc 27 §6 #5).
 */
export class GoodsReceipt {
  public readonly id: string;
  public readonly companyId: string;
  public readonly grNumber: string;
  public readonly purchaseOrderId: string;
  public readonly supplierId: string;
  public readonly destinationOutletId: string;
  public readonly receiveDate: Date;
  public readonly status: GoodsReceiptStatus;
  public readonly inventoryPostedAt: Date | null;
  public readonly notes: string | null;
  public readonly items: GoodsReceiptItem[];
  public readonly statusLogs: GoodsReceiptStatusLog[];
  public readonly approvedBy: string | null;
  public readonly approvedAt: Date | null;
  public readonly createdBy: string | null;
  public readonly updatedBy: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    grNumber: string;
    purchaseOrderId: string;
    supplierId: string;
    destinationOutletId: string;
    receiveDate: Date;
    status: GoodsReceiptStatus;
    inventoryPostedAt: Date | null;
    notes: string | null;
    items: GoodsReceiptItem[];
    statusLogs: GoodsReceiptStatusLog[];
    approvedBy: string | null;
    approvedAt: Date | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.grNumber = payload.grNumber;
    this.purchaseOrderId = payload.purchaseOrderId;
    this.supplierId = payload.supplierId;
    this.destinationOutletId = payload.destinationOutletId;
    this.receiveDate = payload.receiveDate;
    this.status = payload.status;
    this.inventoryPostedAt = payload.inventoryPostedAt;
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
