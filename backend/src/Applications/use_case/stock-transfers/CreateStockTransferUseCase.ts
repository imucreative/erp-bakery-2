import { CreateStockTransfer } from '../../../Domains/stock-transfers/entities/CreateStockTransfer';
import { StockTransfer } from '../../../Domains/stock-transfers/entities/StockTransfer';
import { StockTransferRepository } from '../../../Domains/stock-transfers/StockTransferRepository';
import { InventoryRepository } from '../../../Domains/inventory/InventoryRepository';

/**
 * UseCase: CreateStockTransferUseCase
 *
 * 1. Validate payload (CreateStockTransfer)
 * 2. Verify each source batch exists in the company, belongs to the source
 *    outlet, and matches the declared product (rule #18 — batch identity)
 * 3. Persist DRAFT (repository snapshots batch/lot/expiry from source)
 */
export class CreateStockTransferUseCase {
  constructor(
    private readonly stockTransferRepository: StockTransferRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(payload: unknown, companyId: string, userId: string | null): Promise<StockTransfer> {
    const draft = new CreateStockTransfer(payload);

    for (const item of draft.items) {
      const batch = await this.inventoryRepository.getBatchById(item.sourceBatchId, companyId);
      if (batch.outletId !== draft.sourceOutletId) {
        throw new Error('CREATE_STOCK_TRANSFER.BATCH_OUTLET_MISMATCH');
      }
      if (batch.productId !== item.productId) {
        throw new Error('CREATE_STOCK_TRANSFER.BATCH_PRODUCT_MISMATCH');
      }
    }

    return this.stockTransferRepository.createDraft(companyId, userId, {
      sourceOutletId: draft.sourceOutletId,
      destinationOutletId: draft.destinationOutletId,
      transferDate: draft.transferDate,
      notes: draft.notes,
      items: draft.items,
    });
  }
}
