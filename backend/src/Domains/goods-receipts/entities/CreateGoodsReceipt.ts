/**
 * Raw item input accepted by the Create/Update Goods Receipt payload. Only the
 * client-controlled fields appear here; ordered_quantity is resolved by the use
 * case from the source PO line (snapshot) and must NOT be trusted from input.
 */
export interface CreateGoodsReceiptItemInput {
  purchaseOrderItemId: string;
  productId: string;
  /** Snapshot of the source PO line quantity (resolved server-side, read-only). */
  orderedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  uomId: string;
  batchNumber: string | null;
  lotNumber: string | null;
  /** ISO date string (YYYY-MM-DD) or null. */
  expiryDate: string | null;
}

/**
 * Domain Entity: CreateGoodsReceipt
 *
 * Validates the payload for creating a GR DRAFT. A GR must be raised from an
 * APPROVED Purchase Order (doc 26 §4), so `purchaseOrderId` is mandatory.
 * supplierId and destinationOutletId are NOT accepted from the client — they are
 * inherited (snapshotted) from the source PO by the use case.
 *
 * Items are OPTIONAL at the payload level:
 *   - When provided, each line is validated here (quantities non-negative, at
 *     least one of accepted/rejected > 0).
 *   - When omitted, the use case prefills them from the source PO's OUTSTANDING
 *     lines (accepted = outstanding, rejected = 0).
 *
 * Cross-entity checks (PO status APPROVED, outstanding quota, product
 * batch-tracking requiring batch/expiry, product/uom belong to company) live in
 * the use case / dedicated domain helpers.
 */
export class CreateGoodsReceipt {
  public readonly purchaseOrderId: string;
  public readonly receiveDate: string;
  public readonly notes: string | null;
  /** null when the client did not send items (use case will prefill from PO). */
  public readonly items: RawGoodsReceiptItem[] | null;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.purchaseOrderId = (p.purchaseOrderId as string).trim();
    this.receiveDate = String(p.receiveDate);
    this.notes = p.notes ? String(p.notes).trim() : null;

    if (Array.isArray(p.items) && p.items.length > 0) {
      this.items = (p.items as Record<string, unknown>[]).map((raw) => normaliseItem(raw));
    } else {
      this.items = null;
    }
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_GOODS_RECEIPT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.purchaseOrderId || typeof p.purchaseOrderId !== 'string') {
      throw new Error('CREATE_GOODS_RECEIPT.PURCHASE_ORDER_REQUIRED');
    }
    if (
      !p.receiveDate ||
      (typeof p.receiveDate !== 'string' && !(p.receiveDate instanceof Date))
    ) {
      throw new Error('CREATE_GOODS_RECEIPT.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (!isValidDate(String(p.receiveDate))) {
      throw new Error('CREATE_GOODS_RECEIPT.RECEIVE_DATE_INVALID');
    }

    // Items are optional; validate each only when present.
    if (p.items !== undefined && p.items !== null) {
      if (!Array.isArray(p.items)) {
        throw new Error('CREATE_GOODS_RECEIPT.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      for (const raw of p.items as Record<string, unknown>[]) {
        verifyItem(raw);
      }
    }
  }
}

/**
 * A client-supplied GR line after payload normalisation. ordered_quantity is
 * intentionally absent — the use case fills it from the PO snapshot.
 */
export interface RawGoodsReceiptItem {
  purchaseOrderItemId: string;
  productId: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  uomId: string;
  batchNumber: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
}

function normaliseItem(raw: Record<string, unknown>): RawGoodsReceiptItem {
  return {
    purchaseOrderItemId: (raw.purchaseOrderItemId as string).trim(),
    productId: (raw.productId as string).trim(),
    acceptedQuantity: Number(raw.acceptedQuantity),
    rejectedQuantity: Number(raw.rejectedQuantity),
    uomId: (raw.uomId as string).trim(),
    batchNumber: raw.batchNumber ? String(raw.batchNumber).trim() : null,
    lotNumber: raw.lotNumber ? String(raw.lotNumber).trim() : null,
    expiryDate: raw.expiryDate ? String(raw.expiryDate).trim() : null,
  };
}

/** Validate a single raw GR item payload (shared by create/update). */
export function verifyItem(raw: unknown): void {
  if (!raw || typeof raw !== 'object') {
    throw new Error('CREATE_GOODS_RECEIPT.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
  }
  const item = raw as Record<string, unknown>;
  if (!item.purchaseOrderItemId || typeof item.purchaseOrderItemId !== 'string') {
    throw new Error('CREATE_GOODS_RECEIPT.ITEM_PO_ITEM_REQUIRED');
  }
  if (!item.productId || typeof item.productId !== 'string') {
    throw new Error('CREATE_GOODS_RECEIPT.ITEM_PRODUCT_REQUIRED');
  }
  if (!item.uomId || typeof item.uomId !== 'string') {
    throw new Error('CREATE_GOODS_RECEIPT.ITEM_UOM_REQUIRED');
  }
  assertQuantity(item.acceptedQuantity, 'ACCEPTED');
  assertQuantity(item.rejectedQuantity, 'REJECTED');
}

function assertQuantity(value: unknown, which: 'ACCEPTED' | 'REJECTED'): void {
  if (
    value === undefined ||
    value === null ||
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `CREATE_GOODS_RECEIPT.ITEM_${which}_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION`,
    );
  }
  if (value < 0) {
    throw new Error(`CREATE_GOODS_RECEIPT.ITEM_${which}_QTY_MUST_BE_NON_NEGATIVE`);
  }
}

/**
 * Minimal source PO line shape needed to lock GR items to their source PO and
 * drive the outstanding computation. The use case passes the APPROVED PO's
 * lines here (id = purchase_order_items.id).
 */
export interface SourcePoItem {
  id: string;
  productId: string;
  quantity: number;
  uomId: string;
}

/**
 * Outstanding (remaining receivable) quantity of a single PO line:
 *
 *   outstandingQuantity = qtyPO − receivedQuantity
 *
 * where receivedQuantity is the sum of (accepted + rejected) for that PO line
 * across all CONSUMING GRs of the same PO (status in DRAFT/COMPLETED), and —
 * in edit mode — excluding the GR being edited. CANCELLED GRs release their
 * consumption and are not counted (doc 26 §6.9/§6.10 + the 2026-10-01 [17:30]
 * rule approved by the user). Clamped at 0.
 */
export interface OutstandingPoItem {
  purchaseOrderItemId: string;
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  outstandingQuantity: number;
  uomId: string;
}

/**
 * Build the outstanding map for the source PO lines, given the per-PO-item
 * (accepted + rejected) already consumed by sibling GRs. The consumption map is
 * keyed by purchase_order_items.id (see
 * GoodsReceiptRepository.getConsumedQtyByPoItem).
 */
export function buildOutstandingMap(
  poItems: SourcePoItem[],
  consumedByPoItem: Map<string, number>,
): OutstandingPoItem[] {
  return poItems.map((poItem) => {
    const consumed = consumedByPoItem.get(poItem.id) ?? 0;
    const outstanding = Math.max(0, poItem.quantity - consumed);
    return {
      purchaseOrderItemId: poItem.id,
      productId: poItem.productId,
      orderedQuantity: poItem.quantity,
      receivedQuantity: consumed,
      outstandingQuantity: outstanding,
      uomId: poItem.uomId,
    };
  });
}

/**
 * A GR line fully resolved by the use case: ordered quantity snapshotted from
 * the PO line, quantities validated, and (for accepted batch-tracked products)
 * batch/expiry present. This is what the repository persists.
 *
 * `conversionFactor` is the UOM Conversion T2 snapshot (doc 50 §4/§8): it maps
 * the line's input unit (uomId, inherited from the PO line) to the product base
 * unit so that `baseQty = acceptedQuantity * conversionFactor`. The use case
 * resolves it at create/update time (see resolveConversionFactor); the
 * repository only persists and later reposts the snapshot. Factor 1 (the
 * default when the line is already in the base unit) keeps posting identical to
 * pre-T2 behaviour.
 */
export interface ResolvedGoodsReceiptItem {
  purchaseOrderItemId: string;
  productId: string;
  orderedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  uomId: string;
  conversionFactor: number;
  batchNumber: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
}

/**
 * The minimal per-product conversion context the use case supplies to resolve a
 * GR line's snapshot factor (UOM Conversion T2, doc 50 §4/§8):
 *   - baseUomId: the product's base/stock-keeping unit (products.uom_id).
 *   - activeFactorsByUom: active alternate-unit factors (product_uom_conversions
 *     rows with is_active = true), keyed by the alternate uom_id. The value is
 *     `factor_to_base` (1 <alt uom> = factor_to_base <base>). INACTIVE rows must
 *     be excluded by the caller.
 */
export interface ProductConversionContext {
  baseUomId: string;
  activeFactorsByUom: Map<string, number>;
}

/**
 * Resolve a GR line's snapshot conversion factor (UOM Conversion T2, Keputusan
 * #2b SNAPSHOT), given the line's input `uomId` and the product's conversion
 * context:
 *
 *   1. uomId === base unit            -> factor 1 (implicit, no conversion row).
 *   2. an ACTIVE conversion exists     -> factor_to_base from that row.
 *   3. uomId is NOT the base unit AND  -> HARD ERROR
 *      no active conversion exists        GOODS_RECEIPT.MISSING_UOM_CONVERSION.
 *
 * Case 3 must NEVER silently fall back to 1: a non-base unit without a factor
 * would post the wrong (unconverted) quantity into stock. Failing loudly keeps
 * the inventory ledger correct. The default-1 compatibility guarantee only
 * applies to case 1 (base unit) — exactly the pre-T2 behaviour.
 */
export function resolveConversionFactor(
  uomId: string,
  context: ProductConversionContext,
): number {
  if (uomId === context.baseUomId) {
    return 1;
  }
  const factor = context.activeFactorsByUom.get(uomId);
  if (factor === undefined) {
    throw new Error('GOODS_RECEIPT.MISSING_UOM_CONVERSION');
  }
  if (!(factor > 0)) {
    // Defensive: the master CHECK (> 0) should already guarantee this.
    throw new Error('GOODS_RECEIPT.INVALID_UOM_CONVERSION_FACTOR');
  }
  return factor;
}

/**
 * Validate the GR lines against the source PO AND the outstanding quota
 * (doc 26 §6.8/§6.9/§6.10):
 *
 *   1. ITEM_NOT_IN_PO          — every purchaseOrderItemId must exist in the PO.
 *   2. DUPLICATE_ITEM          — a PO line must not be received twice in one GR.
 *   3. ITEM_PRODUCT_MISMATCH   — the line's productId must match the PO line.
 *   4. ITEM_NOTHING_RECEIVED   — each included line needs accepted > 0 OR
 *                                rejected > 0 (an all-zero line is meaningless).
 *   5. QTY_EXCEEDS_OUTSTANDING — accepted + rejected must not exceed the PO
 *                                line's OUTSTANDING (qtyPO minus what sibling
 *                                GRs already consumed). A line whose outstanding
 *                                is 0 cannot be received at all.
 *
 * A GR MAY receive a subset of the PO lines (partial receipt). The
 * accepted/rejected non-negativity and data types are already guaranteed by
 * verifyItem; this helper enforces the cross-document rules.
 */
export function validateItemsAgainstOutstanding(
  items: ResolvedGoodsReceiptItem[],
  outstanding: OutstandingPoItem[],
): void {
  const byPoItem = new Map<string, OutstandingPoItem>();
  for (const line of outstanding) {
    byPoItem.set(line.purchaseOrderItemId, line);
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.purchaseOrderItemId)) {
      throw new Error('GOODS_RECEIPT.DUPLICATE_ITEM');
    }
    seen.add(item.purchaseOrderItemId);

    const poLine = byPoItem.get(item.purchaseOrderItemId);
    if (!poLine) {
      throw new Error('GOODS_RECEIPT.ITEM_NOT_IN_PO');
    }
    if (poLine.productId !== item.productId) {
      throw new Error('GOODS_RECEIPT.ITEM_PRODUCT_MISMATCH');
    }

    const received = item.acceptedQuantity + item.rejectedQuantity;
    if (received <= 0) {
      throw new Error('GOODS_RECEIPT.ITEM_NOTHING_RECEIVED');
    }
    if (received > poLine.outstandingQuantity) {
      throw new Error('GOODS_RECEIPT.QTY_EXCEEDS_OUTSTANDING');
    }
  }
}

/**
 * Enforce the batch & expiry requirement (doc 27 §6 #10): a batch-tracked
 * product with accepted_quantity > 0 MUST carry a batchNumber and an expiryDate
 * (InventoryBatch.expiredDate is required by the inventory schema, so Stage 2
 * posting would otherwise fail). Non-batch products or rejected-only lines leave
 * them null. `batchTrackedByProduct` maps productId -> isBatchTracked.
 */
export function validateBatchRequirements(
  items: ResolvedGoodsReceiptItem[],
  batchTrackedByProduct: Map<string, boolean>,
): void {
  for (const item of items) {
    const isBatchTracked = batchTrackedByProduct.get(item.productId) ?? false;
    if (!isBatchTracked || item.acceptedQuantity <= 0) {
      continue;
    }
    if (!item.batchNumber) {
      throw new Error('GOODS_RECEIPT.BATCH_REQUIRED');
    }
    if (!item.expiryDate || !isValidDate(item.expiryDate)) {
      throw new Error('GOODS_RECEIPT.EXPIRY_REQUIRED');
    }
  }
}

/** True when the string parses to a valid calendar date. */
export function isValidDate(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  return !Number.isNaN(parsed.getTime());
}
