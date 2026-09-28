import { UpdateStockAdjustment } from '../../../Domains/stock-adjustments/entities/UpdateStockAdjustment';
import { StockAdjustment } from '../../../Domains/stock-adjustments/entities/StockAdjustment';
import { StockAdjustmentRepository } from '../../../Domains/stock-adjustments/StockAdjustmentRepository';
import { InventoryRepository } from '../../../Domains/inventory/InventoryRepository';

/**
 * UseCase: UpdateStockAdjustmentUseCase
 *
 * 1. Validate payload
 * 2. Ensure the adjustment exists and is still a DRAFT (rule #19 — only DRAFT
 *    is editable); repository enforces the status guard too.
 * 3. Verify referenced batches (outlet + product match)
 * 4. Replace header + items
 */
export class UpdateStockAdjustmentUseCase {
  constructor(
    private readonly stockAdjustmentRepository: StockAdjustmentRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
  ): Promise<StockAdjustment> {
    const update = new UpdateStockAdjustment(payload);

    const existing = await this.stockAdjustmentRepository.getById(id, companyId);
    if (existing.status !== 'DRAFT') {
      throw new Error('STOCK_ADJUSTMENT.ONLY_DRAFT_EDITABLE');
    }

    for (const item of update.items) {
      const batch = await this.inventoryRepository.getBatchById(item.batchId, companyId);
      if (batch.outletId !== update.outletId) {
        throw new Error('CREATE_STOCK_ADJUSTMENT.BATCH_OUTLET_MISMATCH');
      }
      if (batch.productId !== item.productId) {
        throw new Error('CREATE_STOCK_ADJUSTMENT.BATCH_PRODUCT_MISMATCH');
      }
    }

    return this.stockAdjustmentRepository.updateDraft(id, companyId, {
      outletId: update.outletId,
      adjustmentDate: update.adjustmentDate,
      notes: update.notes,
      items: update.items,
    });
  }
}
