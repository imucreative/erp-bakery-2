import { CreateStockAdjustment } from '../../../Domains/stock-adjustments/entities/CreateStockAdjustment';
import { StockAdjustment } from '../../../Domains/stock-adjustments/entities/StockAdjustment';
import { StockAdjustmentRepository } from '../../../Domains/stock-adjustments/StockAdjustmentRepository';
import { InventoryRepository } from '../../../Domains/inventory/InventoryRepository';

/**
 * UseCase: CreateStockAdjustmentUseCase
 *
 * 1. Validate payload (CreateStockAdjustment entity)
 * 2. Verify every referenced batch exists in the company and belongs to the
 *    given outlet + product (rule #21 — adjustment only targets existing batches)
 * 3. Persist a DRAFT (no stock mutation; before/after not stored yet)
 */
export class CreateStockAdjustmentUseCase {
  constructor(
    private readonly stockAdjustmentRepository: StockAdjustmentRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<StockAdjustment> {
    const draft = new CreateStockAdjustment(payload);

    // Verify each batch exists, is in this company, and matches outlet + product
    for (const item of draft.items) {
      const batch = await this.inventoryRepository.getBatchById(item.batchId, companyId);
      if (batch.outletId !== draft.outletId) {
        throw new Error('CREATE_STOCK_ADJUSTMENT.BATCH_OUTLET_MISMATCH');
      }
      if (batch.productId !== item.productId) {
        throw new Error('CREATE_STOCK_ADJUSTMENT.BATCH_PRODUCT_MISMATCH');
      }
    }

    return this.stockAdjustmentRepository.createDraft(companyId, userId, {
      outletId: draft.outletId,
      adjustmentDate: draft.adjustmentDate,
      notes: draft.notes,
      items: draft.items,
    });
  }
}
