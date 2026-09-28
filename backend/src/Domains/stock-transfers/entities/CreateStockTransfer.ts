export interface CreateStockTransferItemInput {
  sourceBatchId: string;
  productId: string;
  qty: number;
}

/**
 * Domain Entity: CreateStockTransfer
 *
 * Validates the payload for creating a transfer DRAFT. No stock is moved here.
 * Source and destination outlets must differ (rule #16). Batch identity is
 * snapshotted from the source batch at dispatch time by the repository.
 */
export class CreateStockTransfer {
  public readonly sourceOutletId: string;
  public readonly destinationOutletId: string;
  public readonly transferDate: string | null;
  public readonly notes: string | null;
  public readonly items: CreateStockTransferItemInput[];

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.sourceOutletId = (p.sourceOutletId as string).trim();
    this.destinationOutletId = (p.destinationOutletId as string).trim();
    this.transferDate = p.transferDate ? String(p.transferDate) : null;
    this.notes = p.notes ? String(p.notes).trim() : null;
    this.items = (p.items as Record<string, unknown>[]).map((raw) => ({
      sourceBatchId: (raw.sourceBatchId as string).trim(),
      productId: (raw.productId as string).trim(),
      qty: Number(raw.qty),
    }));
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_STOCK_TRANSFER.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (
      !p.sourceOutletId ||
      typeof p.sourceOutletId !== 'string' ||
      !p.destinationOutletId ||
      typeof p.destinationOutletId !== 'string'
    ) {
      throw new Error('CREATE_STOCK_TRANSFER.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (p.sourceOutletId === p.destinationOutletId) {
      throw new Error('CREATE_STOCK_TRANSFER.SAME_OUTLET');
    }

    if (!Array.isArray(p.items) || p.items.length === 0) {
      throw new Error('CREATE_STOCK_TRANSFER.ITEMS_REQUIRED');
    }

    for (const raw of p.items as Record<string, unknown>[]) {
      if (!raw || typeof raw !== 'object') {
        throw new Error('CREATE_STOCK_TRANSFER.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (!raw.sourceBatchId || typeof raw.sourceBatchId !== 'string') {
        throw new Error('CREATE_STOCK_TRANSFER.ITEM_BATCH_REQUIRED');
      }
      if (!raw.productId || typeof raw.productId !== 'string') {
        throw new Error('CREATE_STOCK_TRANSFER.ITEM_PRODUCT_REQUIRED');
      }
      if (
        raw.qty === undefined ||
        raw.qty === null ||
        typeof raw.qty !== 'number' ||
        !Number.isFinite(raw.qty)
      ) {
        throw new Error('CREATE_STOCK_TRANSFER.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (raw.qty <= 0) {
        throw new Error('CREATE_STOCK_TRANSFER.ITEM_QTY_MUST_BE_POSITIVE');
      }
    }
  }
}
