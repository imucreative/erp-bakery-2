import { SalesReport, SalesReportFilter } from './entities/SalesReport';
import { InventoryReport, InventoryReportFilter } from './entities/InventoryReport';
import { ProductionReport, ProductionReportFilter } from './entities/ProductionReport';

/**
 * Abstract repository — Reports domain (doc 54).
 * Company-scoped read-only reports untuk Sales, Inventory, Production.
 */
export abstract class ReportsRepository {
  /**
   * Sales Report — agregasi penjualan dengan filter date range + outlet + status.
   *
   * @param companyId - Company scope
   * @param filter - Date range, outlet, status filters
   */
  abstract getSalesReport(
    companyId: string,
    filter: SalesReportFilter,
  ): Promise<SalesReport>;

  /**
   * Inventory Report — stock on hand per product dengan batch details.
   *
   * @param companyId - Company scope
   * @param filter - Outlet, product, includeExpired filters
   */
  abstract getInventoryReport(
    companyId: string,
    filter: InventoryReportFilter,
  ): Promise<InventoryReport>;

  /**
   * Production Report — agregasi produksi dengan filter date range + outlet + recipe.
   *
   * @param companyId - Company scope
   * @param filter - Date range, outlet, recipe filters
   */
  abstract getProductionReport(
    companyId: string,
    filter: ProductionReportFilter,
  ): Promise<ProductionReport>;
}
