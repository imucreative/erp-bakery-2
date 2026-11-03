import {
  InventoryRepository,
  StockOnHandResult,
} from '../../../Domains/inventory/InventoryRepository';

export interface StockOnHandQuery {
  limit: number;
  offset: number;
  outletId?: string;
  productId?: string;
  search?: string;
  lowOnly?: boolean;
}

/**
 * UseCase: GetStockOnHandUseCase
 *
 * Read-only. Returns current Stock-On-Hand aggregated per product+outlet,
 * sourced from inventory_batches.qty_available (inventory-domain rule #8) —
 * never by summing the movement ledger.
 *
 * Company-scoped for tenant isolation. Outlet filter (when provided) is
 * validated/authorised upstream in the controller/guard layer.
 */
export class GetStockOnHandUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(
    query: StockOnHandQuery,
    companyId: string,
    businessDate: Date = new Date(),
  ): Promise<StockOnHandResult> {
    return this.inventoryRepository.getStockOnHand(
      companyId,
      {
        limit: query.limit,
        offset: query.offset,
        outletId: query.outletId,
        productId: query.productId,
        search: query.search,
        lowOnly: query.lowOnly,
      },
      businessDate,
    );
  }
}
