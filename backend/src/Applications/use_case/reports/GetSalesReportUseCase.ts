import { ReportsRepository } from '../../../Domains/reports/ReportsRepository';
import { SalesReport, SalesReportFilter } from '../../../Domains/reports/entities/SalesReport';

/**
 * UseCase: GetSalesReportUseCase
 *
 * Read-only sales report aggregation (doc 54).
 * Filtered by date range, outlet, and status.
 */
export class GetSalesReportUseCase {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(
    companyId: string,
    filter: SalesReportFilter,
  ): Promise<SalesReport> {
    return this.reportsRepository.getSalesReport(companyId, filter);
  }
}
