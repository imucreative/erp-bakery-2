import { PurchaseRequestStatus } from '../purchaseRequestStatus';

export interface PurchaseRequestItem {
  id: string;
  productId: string;
  quantity: number;
  uomId: string;
  estimatedPrice: number;
  subtotal: number;
}

export interface PurchaseRequestStatusLog {
  id: string;
  fromStatus: PurchaseRequestStatus | null;
  toStatus: PurchaseRequestStatus;
  actorId: string | null;
  note: string | null;
  createdAt: Date;
}

/**
 * Domain Entity: PurchaseRequest (read value object) — header + items + timeline.
 */
export class PurchaseRequest {
  public readonly id: string;
  public readonly companyId: string;
  public readonly prNumber: string;
  public readonly requestorId: string | null;
  public readonly destinationOutletId: string;
  public readonly expectedDate: Date;
  public readonly totalEstimatedAmount: number;
  public readonly status: PurchaseRequestStatus;
  public readonly notes: string | null;
  public readonly items: PurchaseRequestItem[];
  public readonly statusLogs: PurchaseRequestStatusLog[];
  public readonly approvedBy: string | null;
  public readonly approvedAt: Date | null;
  public readonly createdBy: string | null;
  public readonly updatedBy: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    prNumber: string;
    requestorId: string | null;
    destinationOutletId: string;
    expectedDate: Date;
    totalEstimatedAmount: number;
    status: PurchaseRequestStatus;
    notes: string | null;
    items: PurchaseRequestItem[];
    statusLogs: PurchaseRequestStatusLog[];
    approvedBy: string | null;
    approvedAt: Date | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.prNumber = payload.prNumber;
    this.requestorId = payload.requestorId;
    this.destinationOutletId = payload.destinationOutletId;
    this.expectedDate = payload.expectedDate;
    this.totalEstimatedAmount = payload.totalEstimatedAmount;
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
