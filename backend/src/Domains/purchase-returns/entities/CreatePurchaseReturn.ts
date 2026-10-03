import {
  PurchaseReturnReason,
  isPurchaseReturnReason,
  requiresDescription,
} from '../returnReason';

/**
 * A client-supplied Purchase Return line after payload normalisation. Only the
 * client-controlled fields appear here. All snapshots (posted accepted qty,
 * previously returned qty, product/uom/batch, source movement/batch references)
 * are resolved server-side from the source Goods Receipt + its posted PURCHASE
 * movements, and must NOT be trusted from input (doc 26 §6 #15/#16).
 */
export interface RawPurchaseReturnItem {
  goodsReceiptItemId: string;
  returnQuantity: number;
  reason: PurchaseReturnReason;
  reasonDescription: string | null;
}

/**
 * Domain Entity: CreatePurchaseReturn
 *
 * Validates the payload for creating a Purchase Return DRAFT (doc 26 §6 #14).
 * A return must be raised from a COMPLETED Goods Receipt, so `goodsReceiptId` is
 * mandatory. supplier/outlet snapshots are NOT accepted from the client — they
 * are inherited from the source GR by the use case.
 *
 * Items are mandatory (a return with no lines is meaningless). Per line this
 * entity validates: goodsReceiptItemId present, returnQuantity a finite number
 * > 0, reason a controlled value, and reasonDescription present when the reason
 * is OTHER (doc 26 §6 #17). Cross-document checks (GR status COMPLETED, line
 * belongs to the GR, returnQuantity <= derived returnable) live in the use case
 * / repository against the authoritative posted-movement derivation.
 */
export class CreatePurchaseReturn {
  public readonly goodsReceiptId: string;
  public readonly returnDate: string;
  public readonly notes: string | null;
  public readonly items: RawPurchaseReturnItem[];

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.goodsReceiptId = (p.goodsReceiptId as string).trim();
    this.returnDate = String(p.returnDate);
    this.notes = p.notes ? String(p.notes).trim() : null;
    this.items = (p.items as Record<string, unknown>[]).map((raw) => normaliseItem(raw));
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_PURCHASE_RETURN.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.goodsReceiptId || typeof p.goodsReceiptId !== 'string') {
      throw new Error('CREATE_PURCHASE_RETURN.GOODS_RECEIPT_REQUIRED');
    }
    if (
      !p.returnDate ||
      (typeof p.returnDate !== 'string' && !(p.returnDate instanceof Date))
    ) {
      throw new Error('CREATE_PURCHASE_RETURN.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (!isValidDate(String(p.returnDate))) {
      throw new Error('CREATE_PURCHASE_RETURN.RETURN_DATE_INVALID');
    }

    if (!Array.isArray(p.items) || p.items.length === 0) {
      throw new Error('CREATE_PURCHASE_RETURN.ITEMS_REQUIRED');
    }
    for (const raw of p.items as Record<string, unknown>[]) {
      verifyItem(raw);
    }
  }
}

function normaliseItem(raw: Record<string, unknown>): RawPurchaseReturnItem {
  return {
    goodsReceiptItemId: (raw.goodsReceiptItemId as string).trim(),
    returnQuantity: Number(raw.returnQuantity),
    reason: String(raw.reason).trim() as PurchaseReturnReason,
    reasonDescription: raw.reasonDescription
      ? String(raw.reasonDescription).trim()
      : null,
  };
}

/** Validate a single raw Purchase Return item payload (shared by create/update). */
export function verifyItem(raw: unknown): void {
  if (!raw || typeof raw !== 'object') {
    throw new Error('CREATE_PURCHASE_RETURN.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
  }
  const item = raw as Record<string, unknown>;
  if (!item.goodsReceiptItemId || typeof item.goodsReceiptItemId !== 'string') {
    throw new Error('CREATE_PURCHASE_RETURN.ITEM_GR_ITEM_REQUIRED');
  }

  const qty = Number(item.returnQuantity);
  if (
    item.returnQuantity === undefined ||
    item.returnQuantity === null ||
    typeof item.returnQuantity !== 'number' ||
    !Number.isFinite(qty)
  ) {
    throw new Error('CREATE_PURCHASE_RETURN.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  }
  if (qty <= 0) {
    throw new Error('CREATE_PURCHASE_RETURN.ITEM_QTY_MUST_BE_POSITIVE');
  }

  if (!isPurchaseReturnReason(item.reason)) {
    throw new Error('CREATE_PURCHASE_RETURN.ITEM_REASON_INVALID');
  }
  // reasonDescription is MANDATORY when the reason is OTHER (doc 26 §6 #17).
  const description = item.reasonDescription
    ? String(item.reasonDescription).trim()
    : '';
  if (requiresDescription(item.reason as PurchaseReturnReason) && description.length === 0) {
    throw new Error('CREATE_PURCHASE_RETURN.ITEM_REASON_DESCRIPTION_REQUIRED');
  }
}

/**
 * Returnable derivation for ONE source GR item/batch (doc 26 §6 #14–#16/#18):
 *
 *   returnableQuantity =
 *     postedAcceptedQuantity − completedReturnQuantity − submittedReturnQuantity
 *
 * - postedAcceptedQuantity is the sum of qty on the posted accepted inventory
 *   movement(s) (movement_type = PURCHASE) that GR complete wrote for the GR
 *   item (NOT the GR item snapshot — doc 26 §6 #15).
 * - completedReturnQuantity is the sum of return_quantity across COMPLETED
 *   purchase_return_items of the same GR item.
 * - submittedReturnQuantity is the sum across SUBMITTED purchase_return_items
 *   (the active reservation — doc 26 §6 #18). DRAFT does NOT reserve.
 *
 * Clamped at 0. This is the single derivation used by both getReturnable (list
 * view) and the submit/complete validation (authoritative).
 */
export interface ReturnableSource {
  postedAcceptedQuantity: number;
  completedReturnQuantity: number;
  submittedReturnQuantity: number;
}

export function deriveReturnableQuantity(source: ReturnableSource): number {
  const returnable =
    source.postedAcceptedQuantity -
    source.completedReturnQuantity -
    source.submittedReturnQuantity;
  return Math.max(0, returnable);
}

/** True when the string parses to a valid calendar date. */
export function isValidDate(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  return !Number.isNaN(parsed.getTime());
}
