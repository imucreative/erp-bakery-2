import { ReportsRepository } from '../../../Domains/reports/ReportsRepository';
import { InventoryReport, InventoryReportFilter } from '../../../Domains/reports/entities/InventoryReport';

/**
 * UseCase: GetInventoryReportUseCase
 *
 * Read-only inventory report aggregation (doc 54).
 * Filtered by outlet and product.
 */
export class GetInventoryReportUseCase {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(
    companyId: string,
    filter: InventoryReportFilter,
  ): Promise<InventoryReport> {
    return this.reportsRepository.getInventoryReport(companyId, filter);
  }
}
