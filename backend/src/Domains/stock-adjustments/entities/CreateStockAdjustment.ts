import { isAdjustmentReason, isAdjustmentDirection } from '../adjustmentReason';

export interface CreateStockAdjustmentItemInput {
  batchId: string;
  productId: string;
  direction: 'IN' | 'OUT';
  qty: number;
  reason: string;
  reasonDescription?: string | null;
}

/**
 * Domain Entity: CreateStockAdjustment
 *
 * Validates the payload for creating an adjustment DRAFT. It stores only the
 * adjustment intent (rule #20) — no stock is touched here, and before/after
 * quantities are NOT accepted from the client.
 */
export class CreateStockAdjustment {
  public readonly outletId: string;
  public readonly adjustmentDate: string | null;
  public readonly notes: string | null;
  public readonly items: CreateStockAdjustmentItemInput[];

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.outletId = (p.outletId as string).trim();
    this.adjustmentDate = p.adjustmentDate ? String(p.adjustmentDate) : null;
    this.notes = p.notes ? String(p.notes).trim() : null;
    this.items = (p.items as Record<string, unknown>[]).map((raw) => ({
      batchId: (raw.batchId as string).trim(),
      productId: (raw.productId as string).trim(),
      direction: raw.direction as 'IN' | 'OUT',
      qty: Number(raw.qty),
      reason: raw.reason as string,
      reasonDescription: raw.reasonDescription ? String(raw.reasonDescription).trim() : null,
    }));
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_STOCK_ADJUSTMENT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.outletId || typeof p.outletId !== 'string') {
      throw new Error('CREATE_STOCK_ADJUSTMENT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (!Array.isArray(p.items) || p.items.length === 0) {
      throw new Error('CREATE_STOCK_ADJUSTMENT.ITEMS_REQUIRED');
    }

    for (const raw of p.items as Record<string, unknown>[]) {
      if (!raw || typeof raw !== 'object') {
        throw new Error('CREATE_STOCK_ADJUSTMENT.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (!raw.batchId || typeof raw.batchId !== 'string') {
        throw new Error('CREATE_STOCK_ADJUSTMENT.ITEM_BATCH_REQUIRED');
      }
      if (!raw.productId || typeof raw.productId !== 'string') {
        throw new Error('CREATE_STOCK_ADJUSTMENT.ITEM_PRODUCT_REQUIRED');
      }
      if (!isAdjustmentDirection(raw.direction)) {
        throw new Error('CREATE_STOCK_ADJUSTMENT.ITEM_INVALID_DIRECTION');
      }
      if (
        raw.qty === undefined ||
        raw.qty === null ||
        typeof raw.qty !== 'number' ||
        !Number.isFinite(raw.qty)
      ) {
        throw new Error('CREATE_STOCK_ADJUSTMENT.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (raw.qty <= 0) {
        throw new Error('CREATE_STOCK_ADJUSTMENT.ITEM_QTY_MUST_BE_POSITIVE');
      }
      if (!isAdjustmentReason(raw.reason)) {
        throw new Error('CREATE_STOCK_ADJUSTMENT.ITEM_INVALID_REASON');
      }
    }
  }
}
