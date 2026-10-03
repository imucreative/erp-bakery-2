import { CreatePurchaseReturn } from '../../../Domains/purchase-returns/entities/CreatePurchaseReturn';
import { PurchaseReturn } from '../../../Domains/purchase-returns/entities/PurchaseReturn';
import {
  PurchaseReturnRepository,
  NewPurchaseReturnItemData,
  ReturnableLine,
} from '../../../Domains/purchase-returns/PurchaseReturnRepository';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';

/**
 * Map the client-supplied return lines onto the authoritative returnable lines
 * of the source Goods Receipt and build the fully resolved items the repository
 * persists (doc 26 §6 #14–#16). Shared by create + update.
 *
 * Per client line:
 *   - the goodsReceiptItemId must exist among the GR's returnable lines
 *     (PURCHASE_RETURN.ITEM_NOT_IN_GOODS_RECEIPT);
 *   - a GR item/batch must not be returned twice in one document
 *     (PURCHASE_RETURN.DUPLICATE_ITEM);
 *   - the returnQuantity must not exceed the currently returnable quantity
 *     (PURCHASE_RETURN.RETURN_QTY_EXCEEDS_RETURNABLE). This mirrors the
 *     repository's authoritative re-derivation at submit/complete so the user
 *     gets an early, friendly error at create/update time.
 *
 * Every snapshot (posted accepted qty, previously returned qty, product/uom/
 * batch, source movement + batch references) comes from the returnable line —
 * never from the client (doc 26 §6 #15/#16).
 */
export function resolveReturnItems(
  draftItems: CreatePurchaseReturn['items'],
  returnableLines: ReturnableLine[],
): NewPurchaseReturnItemData[] {
  const byGrItem = new Map<string, ReturnableLine>();
  for (const line of returnableLines) {
    byGrItem.set(line.goodsReceiptItemId, line);
  }

  const seen = new Set<string>();
  return draftItems.map((raw) => {
    if (seen.has(raw.goodsReceiptItemId)) {
      throw new Error('PURCHASE_RETURN.DUPLICATE_ITEM');
    }
    seen.add(raw.goodsReceiptItemId);

    const line = byGrItem.get(raw.goodsReceiptItemId);
    if (!line) {
      throw new Error('PURCHASE_RETURN.ITEM_NOT_IN_GOODS_RECEIPT');
    }
    if (raw.returnQuantity > line.returnableQuantity) {
      throw new Error('PURCHASE_RETURN.RETURN_QTY_EXCEEDS_RETURNABLE');
    }

    return {
      goodsReceiptItemId: line.goodsReceiptItemId,
      sourceBatchId: line.sourceBatchId,
      sourceMovementId: line.sourceMovementId,
      productId: line.productId,
      productSku: line.productSku,
      productName: line.productName,
      uomId: line.uomId,
      uomCode: line.uomCode,
      batchNumber: line.batchNumber,
      lotNumber: line.lotNumber,
      expiredDate: line.expiredDate ? line.expiredDate.toISOString().slice(0, 10) : null,
      postedAcceptedQuantity: line.postedAcceptedQuantity,
      previouslyReturnedQuantity: line.completedReturnQuantity,
      returnQuantity: raw.returnQuantity,
      reason: raw.reason,
      reasonDescription: raw.reasonDescription,
    };
  });
}

/**
 * UseCase: CreatePurchaseReturnUseCase (procurement-domain doc 26 §6 #14–#18).
 *
 * Flow (STAGE 1 — core document, DRAFT only; no stock movement):
 *  1. Validate payload (CreatePurchaseReturn — reason/qty/OTHER-description).
 *  2. Load the source GR (company-scoped) and require it to be COMPLETED
 *     (getReturnable enforces this and throws if not).
 *  3. supplier/outlet snapshots are INHERITED from the GR (supplier via the GR's
 *     supplierId, outlet via the GR's destinationOutletId) — never from input;
 *     purchaseOrderId is inherited too.
 *  4. Resolve returnable lines from the GR's posted accepted PURCHASE movements
 *     and map the payload items onto them (validate membership + returnable).
 *  5. Persist the DRAFT (repository generates return_number, logs null -> DRAFT).
 *     NO inventory movement — that is complete (SUBMITTED -> COMPLETED).
 */
export class CreatePurchaseReturnUseCase {
  constructor(
    private readonly purchaseReturnRepository: PurchaseReturnRepository,
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly outletRepository: OutletRepository,
  ) {}

  async execute(
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<PurchaseReturn> {
    const draft = new CreatePurchaseReturn(payload);

    // 2. Source GR (company-scoped). getReturnable enforces COMPLETED and
    // returns the authoritative returnable lines (also 404s a foreign GR).
    const gr = await this.goodsReceiptRepository.getById(draft.goodsReceiptId, companyId);
    const returnableLines = await this.purchaseReturnRepository.getReturnable(
      draft.goodsReceiptId,
      companyId,
    );

    // 3. Inherit supplier/outlet snapshots from the GR (company-scoped loads).
    const supplier = await this.supplierRepository.getSupplierById(gr.supplierId, companyId);
    const outlet = await this.outletRepository.getOutletById(
      gr.destinationOutletId,
      companyId,
    );

    // 4. Map payload items onto the returnable lines (membership + quota).
    const items = resolveReturnItems(draft.items, returnableLines);

    // 5. Persist DRAFT.
    return this.purchaseReturnRepository.createDraft(companyId, userId, {
      goodsReceiptId: gr.id,
      purchaseOrderId: gr.purchaseOrderId,
      supplierId: supplier.id,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      outletId: outlet.id,
      outletCode: outlet.code,
      outletName: outlet.name,
      returnDate: draft.returnDate,
      notes: draft.notes,
      items,
    });
  }
}
