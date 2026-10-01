export interface CreatePurchaseOrderItemInput {
  productId: string;
  quantity: number;
  uomId: string;
  unitPrice: number;
  /** Percentage tax, e.g. 11 means 11% (doc 26 §6 — tax per item). */
  taxPercent: number;
  /** subtotal = quantity * unitPrice (computed here, anti-tamper). */
  subtotal: number;
  /** taxAmount = subtotal * taxPercent / 100 (computed here, anti-tamper). */
  taxAmount: number;
  /** total = subtotal + taxAmount (computed here, anti-tamper). */
  total: number;
}

/**
 * Domain Entity: CreatePurchaseOrder
 *
 * Validates the payload for creating a PO DRAFT. A PO must be raised from an
 * APPROVED Purchase Request (doc 26 §8), so `purchaseRequestId` and `supplierId`
 * are mandatory. `orderDate` is required and must be a valid date.
 *
 * Items are OPTIONAL at the payload level:
 *   - When provided, each line's money fields are computed here server-side.
 *   - When omitted, the use case prefills them from the source PR (see
 *     CreatePurchaseOrderUseCase) using the shared computeItemMoney helper.
 *
 * `paymentTermId` is optional (the use case resolves the effective payment term
 * from the supplier default when absent). `estimatedPaymentDueDate` is never
 * accepted from the client — it is computed backend-side (doc 26 §6.4).
 *
 * Cross-entity checks (PR status, supplier/outlet/product/uom/paymentTerm belong
 * to company and are active) live in the use case.
 */
export class CreatePurchaseOrder {
  public readonly purchaseRequestId: string;
  public readonly supplierId: string;
  public readonly orderDate: string;
  public readonly paymentTermId: string | null;
  public readonly notes: string | null;
  /** null when the client did not send items (use case will prefill from PR). */
  public readonly items: CreatePurchaseOrderItemInput[] | null;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.purchaseRequestId = (p.purchaseRequestId as string).trim();
    this.supplierId = (p.supplierId as string).trim();
    this.orderDate = String(p.orderDate);
    this.paymentTermId = p.paymentTermId ? String(p.paymentTermId).trim() : null;
    this.notes = p.notes ? String(p.notes).trim() : null;

    if (Array.isArray(p.items) && p.items.length > 0) {
      this.items = (p.items as Record<string, unknown>[]).map((raw) =>
        computeItemMoney({
          productId: (raw.productId as string).trim(),
          quantity: Number(raw.quantity),
          uomId: (raw.uomId as string).trim(),
          unitPrice: Number(raw.unitPrice),
          taxPercent: Number(raw.taxPercent),
        }),
      );
    } else {
      this.items = null;
    }
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_PURCHASE_ORDER.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.purchaseRequestId || typeof p.purchaseRequestId !== 'string') {
      throw new Error('CREATE_PURCHASE_ORDER.PURCHASE_REQUEST_REQUIRED');
    }
    if (!p.supplierId || typeof p.supplierId !== 'string') {
      throw new Error('CREATE_PURCHASE_ORDER.SUPPLIER_REQUIRED');
    }
    if (!p.orderDate || (typeof p.orderDate !== 'string' && !(p.orderDate instanceof Date))) {
      throw new Error('CREATE_PURCHASE_ORDER.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (!isValidDate(String(p.orderDate))) {
      throw new Error('CREATE_PURCHASE_ORDER.ORDER_DATE_INVALID');
    }
    if (p.paymentTermId !== undefined && p.paymentTermId !== null && typeof p.paymentTermId !== 'string') {
      throw new Error('CREATE_PURCHASE_ORDER.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    // Items are optional; validate each only when present.
    if (p.items !== undefined && p.items !== null) {
      if (!Array.isArray(p.items)) {
        throw new Error('CREATE_PURCHASE_ORDER.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      for (const raw of p.items as Record<string, unknown>[]) {
        verifyItem(raw);
      }
    }
  }
}

/** Validate a single raw PO item payload (shared by create/update). */
export function verifyItem(raw: unknown): void {
  if (!raw || typeof raw !== 'object') {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
  }
  const item = raw as Record<string, unknown>;
  if (!item.productId || typeof item.productId !== 'string') {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_PRODUCT_REQUIRED');
  }
  if (!item.uomId || typeof item.uomId !== 'string') {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_UOM_REQUIRED');
  }
  if (
    item.quantity === undefined ||
    item.quantity === null ||
    typeof item.quantity !== 'number' ||
    !Number.isFinite(item.quantity)
  ) {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  }
  if (item.quantity <= 0) {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_QTY_MUST_BE_POSITIVE');
  }
  if (
    item.unitPrice === undefined ||
    item.unitPrice === null ||
    typeof item.unitPrice !== 'number' ||
    !Number.isFinite(item.unitPrice)
  ) {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_PRICE_NOT_MEET_DATA_TYPE_SPECIFICATION');
  }
  if (item.unitPrice < 0) {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_PRICE_MUST_BE_NON_NEGATIVE');
  }
  if (
    item.taxPercent === undefined ||
    item.taxPercent === null ||
    typeof item.taxPercent !== 'number' ||
    !Number.isFinite(item.taxPercent)
  ) {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_TAX_NOT_MEET_DATA_TYPE_SPECIFICATION');
  }
  if (item.taxPercent < 0) {
    throw new Error('CREATE_PURCHASE_ORDER.ITEM_TAX_MUST_BE_NON_NEGATIVE');
  }
}

/**
 * Compute a line's money fields server-side (anti-tamper, doc 26 §6):
 *   subtotal   = quantity * unitPrice
 *   taxAmount  = subtotal * taxPercent / 100
 *   total      = subtotal + taxAmount
 */
export function computeItemMoney(input: {
  productId: string;
  quantity: number;
  uomId: string;
  unitPrice: number;
  taxPercent: number;
}): CreatePurchaseOrderItemInput {
  const subtotal = roundMoney(input.quantity * input.unitPrice);
  const taxAmount = roundMoney((subtotal * input.taxPercent) / 100);
  const total = roundMoney(subtotal + taxAmount);
  return {
    productId: input.productId,
    quantity: input.quantity,
    uomId: input.uomId,
    unitPrice: input.unitPrice,
    taxPercent: input.taxPercent,
    subtotal,
    taxAmount,
    total,
  };
}

/** Round to 2 decimals (currency) avoiding binary float drift. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** True when the string parses to a valid calendar date. */
export function isValidDate(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  return !Number.isNaN(parsed.getTime());
}

/**
 * Compute the estimated payment due date from an order date + due days
 * (doc 26 §6.4). Returns null when dueDays is null/undefined (no payment term).
 * Output is an ISO date string (YYYY-MM-DD).
 */
export function computeEstimatedPaymentDueDate(
  orderDate: string,
  dueDays: number | null,
): string | null {
  if (dueDays === null || dueDays === undefined) {
    return null;
  }
  const base = new Date(orderDate);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  const due = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dueDays);
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(
    due.getDate(),
  ).padStart(2, '0')}`;
}
