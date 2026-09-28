import { UpdateStockTransfer } from '../../../Domains/stock-transfers/entities/UpdateStockTransfer';
import { StockTransfer } from '../../../Domains/stock-transfers/entities/StockTransfer';
import { StockTransferRepository } from '../../../Domains/stock-transfers/StockTransferRepository';
import { InventoryRepository } from '../../../Domains/inventory/InventoryRepository';

/**
 * UseCase: UpdateStockTransferUseCase
 * Only a DRAFT transfer is editable. Verifies batches then replaces the draft.
 */
export class UpdateStockTransferUseCase {
  constructor(
    private readonly stockTransferRepository: StockTransferRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<StockTransfer> {
    const update = new UpdateStockTransfer(payload);

    const existing = await this.stockTransferRepository.getById(id, companyId);
    if (existing.status !== 'DRAFT') {
      throw new Error('STOCK_TRANSFER.ONLY_DRAFT_EDITABLE');
    }

    for (const item of update.items) {
      const batch = await this.inventoryRepository.getBatchById(item.sourceBatchId, companyId);
      if (batch.outletId !== update.sourceOutletId) {
        throw new Error('CREATE_STOCK_TRANSFER.BATCH_OUTLET_MISMATCH');
      }
      if (batch.productId !== item.productId) {
        throw new Error('CREATE_STOCK_TRANSFER.BATCH_PRODUCT_MISMATCH');
      }
    }

    return this.stockTransferRepository.updateDraft(id, companyId, {
      sourceOutletId: update.sourceOutletId,
      destinationOutletId: update.destinationOutletId,
      transferDate: update.transferDate,
      notes: update.notes,
      items: update.items,
    });
  }
}
