import { OpnameStatus } from '../opnameStatus';

export interface StockOpnameItem {
  id: string;
  batchId: string;
  productId: string;
  systemQty: number;
  countedQty: number | null;
  differenceQty: number | null;
}

/**
 * Domain Entity: StockOpname (read value object) — header + items.
 */
export class StockOpname {
  public readonly id: string;
  public readonly companyId: string;
  public readonly outletId: string;
  public readonly opnameNumber: string;
  public readonly opnameDate: Date;
  public readonly status: OpnameStatus;
  public readonly notes: string | null;
  public readonly generatedAdjustmentId: string | null;
  public readonly items: StockOpnameItem[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    outletId: string;
    opnameNumber: string;
    opnameDate: Date;
    status: OpnameStatus;
    notes: string | null;
    generatedAdjustmentId: string | null;
    items: StockOpnameItem[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.outletId = payload.outletId;
    this.opnameNumber = payload.opnameNumber;
    this.opnameDate = payload.opnameDate;
    this.status = payload.status;
    this.notes = payload.notes;
    this.generatedAdjustmentId = payload.generatedAdjustmentId;
    this.items = payload.items;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
