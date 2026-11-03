import { ReportsRepository } from '../../../Domains/reports/ReportsRepository';
import { ProductionReport, ProductionReportFilter } from '../../../Domains/reports/entities/ProductionReport';

/**
 * UseCase: GetProductionReportUseCase
 *
 * Read-only production report aggregation (doc 54).
 * Filtered by date range, outlet, and recipe.
 */
export class GetProductionReportUseCase {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(
    companyId: string,
    filter: ProductionReportFilter,
  ): Promise<ProductionReport> {
    return this.reportsRepository.getProductionReport(companyId, filter);
  }
}
