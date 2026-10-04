import { PurchaseReturnStatus } from '../returnStatus';
import { PurchaseReturnReason } from '../returnReason';

/**
 * A single Purchase Return line (read value object). Product / UOM / batch / lot
 * / expiry are snapshots captured at create time (doc 26 §3/§6 #16). The source
 * reference (sourceBatchId + sourceMovementId) points at the posted accepted GR
 * PURCHASE movement that this line reverses (doc 26 §6 #16/#19).
 */
export interface PurchaseReturnItem {
  id: string;
  goodsReceiptItemId: string;
  /** The InventoryBatch the GR PURCHASE movement credited; the RETURN decrements it. */
  sourceBatchId: string;
  /** The GR PURCHASE inventory_movements row id used as the reversal reference. */
  sourceMovementId: string;
  productId: string;
  productSku: string;
  productName: string;
  uomId: string;
  uomCode: string;
  uomName: string;
  batchNumber: string | null;
  lotNumber: string | null;
  expiredDate: Date | null;
  /** Posted PURCHASE qty for the source GR item/batch (base-unit snapshot). */
  postedAcceptedQuantity: number;
  /** Qty returned by COMPLETED returns of the same GR item/batch at create time. */
  previouslyReturnedQuantity: number;
  /** Quantity being returned by this line (> 0). */
  returnQuantity: number;
  reason: PurchaseReturnReason;
  reasonDescription: string | null;
}

export interface PurchaseReturnStatusLog {
  id: string;
  fromStatus: PurchaseReturnStatus | null;
  toStatus: PurchaseReturnStatus;
  actorId: string | null;
  /** Resolved via LEFT JOIN to users (actor_id -> users.name); null if missing. */
  actorName: string | null;
  note: string | null;
  createdAt: Date;
}

/**
 * Domain Entity: PurchaseReturn (read value object) — header + items + timeline.
 *
 * supplier* and outlet* are snapshots inherited from the source Goods Receipt at
 * create time (doc 26 §3/§6 #14). purchaseOrderId is likewise inherited from the
 * GR for traceability.
 */
export class PurchaseReturn {
  public readonly id: string;
  public readonly companyId: string;
  public readonly returnNumber: string;
  public readonly goodsReceiptId: string;
  public readonly purchaseOrderId: string;
  public readonly supplierId: string;
  public readonly supplierCode: string;
  public readonly supplierName: string;
  public readonly outletId: string;
  public readonly outletCode: string;
  public readonly outletName: string;
  public readonly returnDate: Date;
  public readonly status: PurchaseReturnStatus;
  public readonly notes: string | null;
  public readonly items: PurchaseReturnItem[];
  public readonly statusLogs: PurchaseReturnStatusLog[];
  public readonly createdBy: string | null;
  public readonly updatedBy: string | null;
  public readonly submittedBy: string | null;
  public readonly completedBy: string | null;
  public readonly cancelledBy: string | null;
  public readonly submittedAt: Date | null;
  public readonly completedAt: Date | null;
  public readonly cancelledAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    returnNumber: string;
    goodsReceiptId: string;
    purchaseOrderId: string;
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    outletId: string;
    outletCode: string;
    outletName: string;
    returnDate: Date;
    status: PurchaseReturnStatus;
    notes: string | null;
    items: PurchaseReturnItem[];
    statusLogs: PurchaseReturnStatusLog[];
    createdBy: string | null;
    updatedBy: string | null;
    submittedBy: string | null;
    completedBy: string | null;
    cancelledBy: string | null;
    submittedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.returnNumber = payload.returnNumber;
    this.goodsReceiptId = payload.goodsReceiptId;
    this.purchaseOrderId = payload.purchaseOrderId;
    this.supplierId = payload.supplierId;
    this.supplierCode = payload.supplierCode;
    this.supplierName = payload.supplierName;
    this.outletId = payload.outletId;
    this.outletCode = payload.outletCode;
    this.outletName = payload.outletName;
    this.returnDate = payload.returnDate;
    this.status = payload.status;
    this.notes = payload.notes;
    this.items = payload.items;
    this.statusLogs = payload.statusLogs;
    this.createdBy = payload.createdBy;
    this.updatedBy = payload.updatedBy;
    this.submittedBy = payload.submittedBy;
    this.completedBy = payload.completedBy;
    this.cancelledBy = payload.cancelledBy;
    this.submittedAt = payload.submittedAt;
    this.completedAt = payload.completedAt;
    this.cancelledAt = payload.cancelledAt;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
