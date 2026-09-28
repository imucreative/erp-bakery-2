import {
  InventoryRepository,
  LedgerResult,
} from '../../../Domains/inventory/InventoryRepository';
import { isMovementType } from '../../../Domains/inventory/movementTypes';

export interface StockLedgerQuery {
  limit: number;
  offset: number;
  outletId?: string;
  productId?: string;
  batchId?: string;
  movementType?: string;
}

/**
 * UseCase: GetStockLedgerUseCase
 *
 * Read-only. Returns the immutable inventory movement ledger
 * (inventory-domain rule #9). Rows are never edited/deleted.
 * Rejects an unknown movementType filter early.
 */
export class GetStockLedgerUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(query: StockLedgerQuery, companyId: string): Promise<LedgerResult> {
    if (query.movementType && !isMovementType(query.movementType)) {
      throw new Error('INVENTORY.INVALID_MOVEMENT_TYPE');
    }

    return this.inventoryRepository.getLedger(companyId, {
      limit: query.limit,
      offset: query.offset,
      outletId: query.outletId,
      productId: query.productId,
      batchId: query.batchId,
      movementType: query.movementType,
    });
  }
}
