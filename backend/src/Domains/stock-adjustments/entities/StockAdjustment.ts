import { AdjustmentStatus } from '../adjustmentStatus';
import { AdjustmentDirection, AdjustmentReason } from '../adjustmentReason';

/**
 * Read value object: a stock adjustment item line.
 */
export interface StockAdjustmentItem {
  id: string;
  batchId: string;
  productId: string;
  direction: AdjustmentDirection;
  qty: number;
  reason: AdjustmentReason;
  reasonDescription: string | null;
  beforeQty: number | null; // filled only after completion
  afterQty: number | null;
}

/**
 * Domain Entity: StockAdjustment (read value object) — header + items.
 */
export class StockAdjustment {
  public readonly id: string;
  public readonly companyId: string;
  public readonly outletId: string;
  public readonly adjustmentNumber: string;
  public readonly adjustmentDate: Date;
  public readonly status: AdjustmentStatus;
  public readonly notes: string | null;
  public readonly items: StockAdjustmentItem[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    outletId: string;
    adjustmentNumber: string;
    adjustmentDate: Date;
    status: AdjustmentStatus;
    notes: string | null;
    items: StockAdjustmentItem[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.outletId = payload.outletId;
    this.adjustmentNumber = payload.adjustmentNumber;
    this.adjustmentDate = payload.adjustmentDate;
    this.status = payload.status;
    this.notes = payload.notes;
    this.items = payload.items;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
