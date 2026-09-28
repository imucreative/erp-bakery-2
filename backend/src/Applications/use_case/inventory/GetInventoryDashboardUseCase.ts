import {
  InventoryRepository,
  InventoryDashboardSummary,
} from '../../../Domains/inventory/InventoryRepository';

/**
 * UseCase: GetInventoryDashboardUseCase
 *
 * Read-only inventory monitoring dashboard (inventory-domain rule #26).
 * Aggregates scoped backend data; never mutates stock, never computes totals
 * from paginated frontend rows. Optional outlet scope.
 */
export class GetInventoryDashboardUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(
    companyId: string,
    outletId?: string,
    businessDate: Date = new Date(),
  ): Promise<InventoryDashboardSummary> {
    return this.inventoryRepository.getDashboardSummary(companyId, businessDate, outletId);
  }
}
