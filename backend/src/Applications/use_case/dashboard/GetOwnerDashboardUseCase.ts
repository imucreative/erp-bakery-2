import {
  DashboardRepository,
  OwnerDashboardFilter,
} from '../../../Domains/dashboard/DashboardRepository';
import { OwnerDashboardSummary } from '../../../Domains/dashboard/entities/DashboardSummary';

/**
 * UseCase: GetOwnerDashboardUseCase
 *
 * Read-only owner dashboard aggregation (doc 54).
 * Menggabungkan metrik Sales + Inventory untuk company-wide view.
 */
export class GetOwnerDashboardUseCase {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async execute(
    companyId: string,
    filter: OwnerDashboardFilter = {},
    businessDate: Date = new Date(),
  ): Promise<OwnerDashboardSummary> {
    return this.dashboardRepository.getOwnerSummary(companyId, filter, businessDate);
  }
}
