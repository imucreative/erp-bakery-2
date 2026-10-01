import {
  CreateGoodsReceipt,
  ResolvedGoodsReceiptItem,
  buildOutstandingMap,
  validateItemsAgainstOutstanding,
  validateBatchRequirements,
  SourcePoItem,
} from '../../../Domains/goods-receipts/entities/CreateGoodsReceipt';
import { GoodsReceipt } from '../../../Domains/goods-receipts/entities/GoodsReceipt';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: CreateGoodsReceiptUseCase
 *
 * Business flow (procurement-domain doc 26, STAGE 1 — core document, NO
 * inventory posting):
 *  1. Validate payload (CreateGoodsReceipt).
 *  2. Load the source PO (company-scoped) and require status APPROVED (§4). A PO
 *     may spawn many partial GRs, so a second GR from the same PO is NOT blocked.
 *  3. supplierId and destinationOutletId are INHERITED (snapshotted) from the PO
 *     — never taken from the client.
 *  4. Compute each PO line's OUTSTANDING (remaining receivable) quantity across
 *     all CONSUMING sibling GRs (DRAFT/COMPLETED) of the same PO. On create
 *     there is no GR to exclude.
 *  5. Resolve items:
 *       - If the body sent items, map them to the PO line (ordered = PO qty
 *         snapshot) and keep the accepted/rejected/batch fields.
 *       - If the body omitted items, PREFILL ONLY the PO lines whose outstanding
 *         is > 0, with acceptedQuantity = outstanding, rejectedQuantity = 0.
 *     Items are LOCKED to the source PO AND the outstanding quota: every
 *     purchaseOrderItemId must belong to the PO, no duplicate PO lines, product
 *     must match the PO line, each included line must receive something, and
 *     accepted + rejected must not exceed the PO line's outstanding. A subset of
 *     PO lines is allowed. When every PO line is fully received, creation is
 *     rejected with GOODS_RECEIPT.NO_OUTSTANDING_ITEMS.
 *  6. Enforce batch & expiry for accepted batch-tracked products (doc 27 §6 #10).
 *  7. Validate every item product/uom belongs to the company.
 *  8. Persist the DRAFT (repository generates gr_number, logs null -> DRAFT).
 *     NO inventory movement is created — that is Stage 2 (complete).
 */
export class CreateGoodsReceiptUseCase {
  constructor(
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
  ) {}

  async execute(
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<GoodsReceipt> {
    const draft = new CreateGoodsReceipt(payload);

    // 2. Source PO must exist in the company and be APPROVED.
    const po = await this.purchaseOrderRepository.getById(draft.purchaseOrderId, companyId);
    if (po.status !== 'APPROVED') {
      throw new Error('GOODS_RECEIPT.PO_NOT_APPROVED');
    }

    // 4. Outstanding per PO line from consuming sibling GRs (DRAFT/COMPLETED;
    // CANCELLED releases consumption). No GR to exclude on create.
    const sourcePoItems: SourcePoItem[] = po.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      uomId: i.uomId,
    }));
    const consumedByPoItem = await this.goodsReceiptRepository.getConsumedQtyByPoItem(
      draft.purchaseOrderId,
      companyId,
    );
    const outstanding = buildOutstandingMap(sourcePoItems, consumedByPoItem);

    // 5. Resolve items (provided vs prefilled from outstanding).
    const poItemById = new Map(po.items.map((i) => [i.id, i]));
    const items: ResolvedGoodsReceiptItem[] =
      draft.items !== null
        ? draft.items.map((raw) => {
            const poItem = poItemById.get(raw.purchaseOrderItemId);
            // ordered_quantity snapshot comes from the PO line; a missing PO
            // line is caught by validateItemsAgainstOutstanding (ITEM_NOT_IN_PO).
            return {
              purchaseOrderItemId: raw.purchaseOrderItemId,
              productId: raw.productId,
              orderedQuantity: poItem ? poItem.quantity : 0,
              acceptedQuantity: raw.acceptedQuantity,
              rejectedQuantity: raw.rejectedQuantity,
              uomId: raw.uomId,
              batchNumber: raw.batchNumber,
              lotNumber: raw.lotNumber,
              expiryDate: raw.expiryDate,
            };
          })
        : outstanding
            .filter((line) => line.outstandingQuantity > 0)
            .map((line) => ({
              purchaseOrderItemId: line.purchaseOrderItemId,
              productId: line.productId,
              orderedQuantity: line.orderedQuantity,
              acceptedQuantity: line.outstandingQuantity,
              rejectedQuantity: 0,
              uomId: line.uomId,
              batchNumber: null,
              lotNumber: null,
              expiryDate: null,
            }));

    // When the body omitted items and nothing remains, there is nothing to
    // receive — reject with a friendly code rather than a generic empty error.
    if (draft.items === null && items.length === 0) {
      throw new Error('GOODS_RECEIPT.NO_OUTSTANDING_ITEMS');
    }
    if (items.length === 0) {
      throw new Error('CREATE_GOODS_RECEIPT.ITEMS_REQUIRED');
    }

    // 5a. Items locked to the source PO + outstanding quota.
    validateItemsAgainstOutstanding(items, outstanding);

    // 6. Batch & expiry for accepted batch-tracked products. Resolve products
    // (company-scoped) once and reuse the records to learn isBatchTracked.
    const productIds = [...new Set(items.map((i) => i.productId))];
    const uomIds = [...new Set(items.map((i) => i.uomId))];
    const products = await Promise.all(
      productIds.map((id) => this.productRepository.getProductById(id, companyId)),
    );
    await Promise.all(uomIds.map((id) => this.uomRepository.getUomById(id, companyId)));

    const batchTrackedByProduct = new Map<string, boolean>();
    for (const product of products) {
      batchTrackedByProduct.set(product.id, product.isBatchTracked);
    }
    validateBatchRequirements(items, batchTrackedByProduct);

    // 8. Persist DRAFT. supplier/destination inherited from the PO (snapshot).
    return this.goodsReceiptRepository.createDraft(companyId, userId, {
      purchaseOrderId: draft.purchaseOrderId,
      supplierId: po.supplierId,
      destinationOutletId: po.destinationOutletId,
      receiveDate: draft.receiveDate,
      items,
      notes: draft.notes,
    });
  }
}
