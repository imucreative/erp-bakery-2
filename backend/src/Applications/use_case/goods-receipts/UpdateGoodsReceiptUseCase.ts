import { UpdateGoodsReceipt } from '../../../Domains/goods-receipts/entities/UpdateGoodsReceipt';
import {
  ResolvedGoodsReceiptItem,
  buildOutstandingMap,
  validateItemsAgainstOutstanding,
  validateBatchRequirements,
  resolveConversionFactor,
  SourcePoItem,
} from '../../../Domains/goods-receipts/entities/CreateGoodsReceipt';
import { GoodsReceipt } from '../../../Domains/goods-receipts/entities/GoodsReceipt';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { ProductUomConversionRepository } from '../../../Domains/product-uom-conversions/ProductUomConversionRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';
import { buildConversionContexts } from './CreateGoodsReceiptUseCase';

/**
 * UseCase: UpdateGoodsReceiptUseCase — edit an editable GR (DRAFT only).
 *
 * Validation and resolution mirror create: the source PO must still be APPROVED,
 * supplier/destination are re-inherited from the PO, items are locked to the PO
 * lines + the cross-GR outstanding quota, and accepted batch-tracked products
 * require batch/expiry. The repository enforces the editable-status gate.
 *
 * Because this very GR already consumes part of the quota, its OWN consumption
 * is EXCLUDED from the outstanding computation (via getConsumedQtyByPoItem's
 * excludeGoodsReceiptId) so it is never counted against itself. No inventory is
 * posted (Stage 1).
 */
export class UpdateGoodsReceiptUseCase {
  constructor(
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
    private readonly conversionRepository: ProductUomConversionRepository,
  ) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<GoodsReceipt> {
    const draft = new UpdateGoodsReceipt(payload);

    const po = await this.purchaseOrderRepository.getById(draft.purchaseOrderId, companyId);
    if (po.status !== 'APPROVED') {
      throw new Error('GOODS_RECEIPT.PO_NOT_APPROVED');
    }

    const sourcePoItems: SourcePoItem[] = po.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      uomId: i.uomId,
    }));
    // Exclude THIS GR's own consumption so it is not counted against itself.
    const consumedByPoItem = await this.goodsReceiptRepository.getConsumedQtyByPoItem(
      draft.purchaseOrderId,
      companyId,
      id,
    );
    const outstanding = buildOutstandingMap(sourcePoItems, consumedByPoItem);

    const poItemById = new Map(po.items.map((i) => [i.id, i]));
    const items: ResolvedGoodsReceiptItem[] =
      draft.items !== null
        ? draft.items.map((raw) => {
            const poItem = poItemById.get(raw.purchaseOrderItemId);
            return {
              purchaseOrderItemId: raw.purchaseOrderItemId,
              productId: raw.productId,
              orderedQuantity: poItem ? poItem.quantity : 0,
              acceptedQuantity: raw.acceptedQuantity,
              rejectedQuantity: raw.rejectedQuantity,
              uomId: raw.uomId,
              conversionFactor: 1,
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
              conversionFactor: 1,
              batchNumber: null,
              lotNumber: null,
              expiryDate: null,
            }));

    if (draft.items === null && items.length === 0) {
      throw new Error('GOODS_RECEIPT.NO_OUTSTANDING_ITEMS');
    }
    if (items.length === 0) {
      throw new Error('CREATE_GOODS_RECEIPT.ITEMS_REQUIRED');
    }

    validateItemsAgainstOutstanding(items, outstanding);

    const productIds = [...new Set(items.map((i) => i.productId))];
    const uomIds = [...new Set(items.map((i) => i.uomId))];
    const products = await Promise.all(
      productIds.map((pid) => this.productRepository.getProductById(pid, companyId)),
    );
    await Promise.all(uomIds.map((uid) => this.uomRepository.getUomById(uid, companyId)));

    const batchTrackedByProduct = new Map<string, boolean>();
    for (const product of products) {
      batchTrackedByProduct.set(product.id, product.isBatchTracked);
    }
    validateBatchRequirements(items, batchTrackedByProduct);

    // UOM Conversion T2 (doc 50 §4/§8, Keputusan #2b SNAPSHOT): re-resolve &
    // re-snapshot each line's factor from the CURRENT master state on every
    // draft update (the snapshot tracks the factor at edit time; posting later
    // uses whatever was last snapshotted). Mirrors CreateGoodsReceiptUseCase.
    const conversionsByProduct = new Map(
      await Promise.all(
        productIds.map(
          async (pid) =>
            [pid, await this.conversionRepository.listByProduct(pid, companyId)] as const,
        ),
      ),
    );
    const conversionContexts = buildConversionContexts(products, conversionsByProduct);
    for (const item of items) {
      const context = conversionContexts.get(item.productId);
      item.conversionFactor = resolveConversionFactor(item.uomId, context!);
    }

    return this.goodsReceiptRepository.updateDraft(id, companyId, userId, {
      purchaseOrderId: draft.purchaseOrderId,
      supplierId: po.supplierId,
      destinationOutletId: po.destinationOutletId,
      receiveDate: draft.receiveDate,
      items,
      notes: draft.notes,
    });
  }
}
