import { BatchStatus } from '../batchStatus';

/**
 * Normalise a nullable lot number into a deterministic lot key
 * (inventory-domain rule #11): empty/whitespace/undefined => ''.
 * Trimmed; case preserved (lot codes may be case-sensitive).
 */
export function normalizeLotKey(lotNumber: string | null | undefined): string {
  if (lotNumber === null || lotNumber === undefined) return '';
  const trimmed = String(lotNumber).trim();
  return trimmed;
}

/**
 * Domain Entity: InventoryBatch (read value object).
 * Represents a persisted batch balance row. qty_available is authoritative
 * Stock-On-Hand (inventory-domain rule #8).
 */
export class InventoryBatch {
  public readonly id: string;
  public readonly companyId: string;
  public readonly outletId: string;
  public readonly productId: string;
  public readonly batchNumber: string;
  public readonly lotKey: string;
  public readonly lotNumber: string | null;
  public readonly expiredDate: Date | null;
  public readonly receivedDate: Date | null;
  public readonly qtyAvailable: number;
  public readonly status: BatchStatus;
  public readonly isNonBatch: boolean;

  constructor(payload: {
    id: string;
    companyId: string;
    outletId: string;
    productId: string;
    batchNumber: string;
    lotKey: string;
    lotNumber?: string | null;
    expiredDate: Date | null;
    receivedDate?: Date | null;
    qtyAvailable: number;
    status: BatchStatus;
    isNonBatch?: boolean;
  }) {
    const { id, companyId, outletId, productId, batchNumber } = payload;

    if (!id || !companyId || !outletId || !productId || batchNumber === undefined) {
      throw new Error('INVENTORY_BATCH.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.outletId = outletId;
    this.productId = productId;
    this.batchNumber = batchNumber;
    this.lotKey = payload.lotKey ?? '';
    this.lotNumber = payload.lotNumber ?? null;
    this.expiredDate = payload.expiredDate ?? null;
    this.receivedDate = payload.receivedDate ?? null;
    this.qtyAvailable = Number(payload.qtyAvailable);
    this.status = payload.status;
    this.isNonBatch = payload.isNonBatch ?? false;
  }
}
