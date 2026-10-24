import {
  OwnerDashboardSummary,
  OutletDashboardSummary,
} from './entities/DashboardSummary';

/**
 * Abstract repository — Dashboard domain (doc 54).
 * Company-scoped read-only aggregates untuk Owner & Outlet dashboards.
 */
export abstract class DashboardRepository {
  /**
   * Owner Dashboard Summary — agregasi metrik company-wide.
   * Menggabungkan data dari Sales (revenue, transactions, trends, top products)
   * dan Inventory (low stock, expired, expiring soon).
   *
   * @param companyId - Company scope
   * @param businessDate - Tanggal referensi untuk "today" (default: now)
   */
  abstract getOwnerSummary(
    companyId: string,
    businessDate?: Date,
  ): Promise<OwnerDashboardSummary>;

  /**
   * Outlet Dashboard Summary — metrik scoped ke satu outlet.
   * Varian ringkas dari Owner dashboard.
   *
   * @param companyId - Company scope
   * @param outletId - Outlet scope
   * @param businessDate - Tanggal referensi untuk "today" (default: now)
   */
  abstract getOutletSummary(
    companyId: string,
    outletId: string,
    businessDate?: Date,
  ): Promise<OutletDashboardSummary>;
}
