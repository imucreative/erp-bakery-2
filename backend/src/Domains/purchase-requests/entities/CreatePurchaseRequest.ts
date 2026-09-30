export interface CreatePurchaseRequestItemInput {
  productId: string;
  quantity: number;
  uomId: string;
  estimatedPrice: number;
  /** subtotal = quantity * estimatedPrice, computed here (anti-tamper). */
  subtotal: number;
}

/**
 * Domain Entity: CreatePurchaseRequest
 *
 * Validates the payload for creating a PR DRAFT and computes each line subtotal
 * plus the header total server-side (doc 34 §2 — no client tampering).
 *
 * Business validation (doc 34 §2):
 *   - destinationOutletId required
 *   - expectedDate must be tomorrow or later (today/past rejected)
 *   - at least one item
 *   - quantity > 0, estimatedPrice >= 0 per item
 *
 * Cross-entity checks (outlet/product/uom belong to company) live in the use case.
 */
export class CreatePurchaseRequest {
  public readonly destinationOutletId: string;
  public readonly expectedDate: string;
  public readonly notes: string | null;
  public readonly items: CreatePurchaseRequestItemInput[];
  public readonly totalEstimatedAmount: number;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.destinationOutletId = (p.destinationOutletId as string).trim();
    this.expectedDate = String(p.expectedDate);
    this.notes = p.notes ? String(p.notes).trim() : null;
    this.items = (p.items as Record<string, unknown>[]).map((raw) => {
      const quantity = Number(raw.quantity);
      const estimatedPrice = Number(raw.estimatedPrice);
      return {
        productId: (raw.productId as string).trim(),
        quantity,
        uomId: (raw.uomId as string).trim(),
        estimatedPrice,
        subtotal: roundMoney(quantity * estimatedPrice),
      };
    });
    this.totalEstimatedAmount = roundMoney(
      this.items.reduce((sum, item) => sum + item.subtotal, 0),
    );
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_PURCHASE_REQUEST.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.destinationOutletId || typeof p.destinationOutletId !== 'string') {
      throw new Error('CREATE_PURCHASE_REQUEST.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (!p.expectedDate || (typeof p.expectedDate !== 'string' && !(p.expectedDate instanceof Date))) {
      throw new Error('CREATE_PURCHASE_REQUEST.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (!isTomorrowOrLater(String(p.expectedDate))) {
      throw new Error('CREATE_PURCHASE_REQUEST.EXPECTED_DATE_TOO_EARLY');
    }

    if (!Array.isArray(p.items) || p.items.length === 0) {
      throw new Error('CREATE_PURCHASE_REQUEST.ITEMS_REQUIRED');
    }

    for (const raw of p.items as Record<string, unknown>[]) {
      if (!raw || typeof raw !== 'object') {
        throw new Error('CREATE_PURCHASE_REQUEST.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (!raw.productId || typeof raw.productId !== 'string') {
        throw new Error('CREATE_PURCHASE_REQUEST.ITEM_PRODUCT_REQUIRED');
      }
      if (!raw.uomId || typeof raw.uomId !== 'string') {
        throw new Error('CREATE_PURCHASE_REQUEST.ITEM_UOM_REQUIRED');
      }
      if (
        raw.quantity === undefined ||
        raw.quantity === null ||
        typeof raw.quantity !== 'number' ||
        !Number.isFinite(raw.quantity)
      ) {
        throw new Error('CREATE_PURCHASE_REQUEST.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (raw.quantity <= 0) {
        throw new Error('CREATE_PURCHASE_REQUEST.ITEM_QTY_MUST_BE_POSITIVE');
      }
      if (
        raw.estimatedPrice === undefined ||
        raw.estimatedPrice === null ||
        typeof raw.estimatedPrice !== 'number' ||
        !Number.isFinite(raw.estimatedPrice)
      ) {
        throw new Error('CREATE_PURCHASE_REQUEST.ITEM_PRICE_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (raw.estimatedPrice < 0) {
        throw new Error('CREATE_PURCHASE_REQUEST.ITEM_PRICE_MUST_BE_NON_NEGATIVE');
      }
    }
  }
}

/** Round to 2 decimals (currency) avoiding binary float drift. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Returns true when the given date string represents tomorrow or a later day,
 * compared in calendar-day terms (time-of-day ignored, local server date).
 */
export function isTomorrowOrLater(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const expected = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return expected.getTime() >= tomorrow.getTime();
}
