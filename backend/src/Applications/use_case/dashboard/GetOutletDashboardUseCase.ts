import { DashboardRepository } from '../../../Domains/dashboard/DashboardRepository';
import { OutletDashboardSummary } from '../../../Domains/dashboard/entities/DashboardSummary';

/**
 * UseCase: GetOutletDashboardUseCase
 *
 * Read-only outlet dashboard aggregation (doc 54).
 * Varian ringkas dari Owner dashboard, scoped ke satu outlet.
 */
export class GetOutletDashboardUseCase {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async execute(
    companyId: string,
    outletId: string,
    businessDate: Date = new Date(),
  ): Promise<OutletDashboardSummary> {
    return this.dashboardRepository.getOutletSummary(companyId, outletId, businessDate);
  }
}
