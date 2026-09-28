import { TransferStatus } from '../transferStatus';

export interface StockTransferItem {
  id: string;
  sourceBatchId: string;
  productId: string;
  qty: number;
  batchNumber: string;
  lotKey: string;
  lotNumber: string | null;
  expiredDate: Date | null;
  destinationBatchId: string | null; // set on receive
}

/**
 * Domain Entity: StockTransfer (read value object) — header + items.
 */
export class StockTransfer {
  public readonly id: string;
  public readonly companyId: string;
  public readonly sourceOutletId: string;
  public readonly destinationOutletId: string;
  public readonly transferNumber: string;
  public readonly transferDate: Date;
  public readonly status: TransferStatus;
  public readonly notes: string | null;
  public readonly items: StockTransferItem[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    sourceOutletId: string;
    destinationOutletId: string;
    transferNumber: string;
    transferDate: Date;
    status: TransferStatus;
    notes: string | null;
    items: StockTransferItem[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.sourceOutletId = payload.sourceOutletId;
    this.destinationOutletId = payload.destinationOutletId;
    this.transferNumber = payload.transferNumber;
    this.transferDate = payload.transferDate;
    this.status = payload.status;
    this.notes = payload.notes;
    this.items = payload.items;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
