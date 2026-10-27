import { Pool } from 'pg';
import {
  DashboardRepository,
  OwnerDashboardFilter,
} from '../../Domains/dashboard/DashboardRepository';
import {
  OwnerDashboardSummary,
  OutletDashboardSummary,
  SalesTrendPoint,
  ExpiringBatch,
  TopSellingProduct,
} from '../../Domains/dashboard/entities/DashboardSummary';
import { INVENTORY_EXPIRY_SOON_DAYS } from '../../Domains/inventory/batchStatus';

/**
 * PostgreSQL implementation — DashboardRepository (doc 54).
 * Read-only aggregates dari Sales + Inventory tables.
 */
export class DashboardRepositoryPostgres extends DashboardRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async getOwnerSummary(
    companyId: string,
    filter: OwnerDashboardFilter = {},
    businessDate: Date = new Date(),
  ): Promise<OwnerDashboardSummary> {
    const { outletId, periodDays = 7, topProductsLimit = 10 } = filter;
    // Calculate Jakarta date (UTC+7) for "today"
    const jakartaNow = new Date(businessDate.getTime() + 7 * 60 * 60 * 1000);
    const bizDate = jakartaNow.toISOString().slice(0, 10);
    const soonBoundary = new Date(jakartaNow);
    soonBoundary.setUTCDate(soonBoundary.getUTCDate() + INVENTORY_EXPIRY_SOON_DAYS);
    const soonDate = soonBoundary.toISOString().slice(0, 10);

    const trendStart = new Date(jakartaNow);
    trendStart.setUTCDate(trendStart.getUTCDate() - (periodDays - 1));
    const trendStartDate = trendStart.toISOString().slice(0, 10);

    // Parallel queries untuk performance
    const [salesMetrics, inventoryMetrics, salesTrend, expiringSoon, topProducts] =
      await Promise.all([
        this.getSalesMetrics(companyId, bizDate, outletId),
        this.getInventoryMetrics(companyId, bizDate, soonDate, outletId),
        this.getSalesTrend(companyId, trendStartDate, bizDate, outletId),
        this.getExpiringSoonBatches(companyId, bizDate, soonDate, outletId),
        this.getTopSellingProducts(companyId, trendStartDate, bizDate, outletId, topProductsLimit),
      ]);

    return new OwnerDashboardSummary({
      revenueToday: salesMetrics.revenueToday,
      salesToday: salesMetrics.salesToday,
      lowStockCount: inventoryMetrics.lowStockCount,
      expiredCount: inventoryMetrics.expiredCount,
      salesTrend,
      expiringSoon,
      topProducts,
    });
  }

  async getOutletSummary(
    companyId: string,
    outletId: string,
    businessDate: Date = new Date(),
  ): Promise<OutletDashboardSummary> {
    // Calculate Jakarta date (UTC+7) for "today"
    const jakartaNow = new Date(businessDate.getTime() + 7 * 60 * 60 * 1000);
    const bizDate = jakartaNow.toISOString().slice(0, 10);
    const soonBoundary = new Date(jakartaNow);
    soonBoundary.setUTCDate(soonBoundary.getUTCDate() + INVENTORY_EXPIRY_SOON_DAYS);
    const soonDate = soonBoundary.toISOString().slice(0, 10);

    // Parallel queries
    const [salesMetrics, inventoryMetrics, outletInfo] = await Promise.all([
      this.getOutletSalesMetrics(companyId, outletId, bizDate),
      this.getOutletInventoryMetrics(companyId, outletId, bizDate, soonDate),
      this.getOutletName(outletId),
    ]);

    return new OutletDashboardSummary({
      outletId,
      outletName: outletInfo,
      salesToday: salesMetrics.salesToday,
      revenueToday: salesMetrics.revenueToday,
      lowStockCount: inventoryMetrics.lowStockCount,
      pendingRequests: 0, // placeholder untuk replenishment
    });
  }

  private async getSalesMetrics(
    companyId: string,
    bizDate: string,
    outletId?: string,
  ): Promise<{ revenueToday: number; salesToday: number }> {
    const result = await this.pool.query<{ revenue: string; count: string }>(
      `SELECT
         COALESCE(SUM(grand_total), 0) AS revenue,
         COUNT(*) AS count
       FROM sales_orders
       WHERE company_id = $1
         AND status = 'PAID'
         AND DATE(paid_at + interval '7 hours') = $2::date
         ${outletId ? 'AND outlet_id = $3' : ''}`,
      outletId ? [companyId, bizDate, outletId] : [companyId, bizDate],
    );

    return {
      revenueToday: parseFloat(result.rows[0].revenue),
      salesToday: parseInt(result.rows[0].count, 10),
    };
  }

  private async getInventoryMetrics(
    companyId: string,
    bizDate: string,
    soonDate: string,
    outletId?: string,
  ): Promise<{ lowStockCount: number; expiredCount: number }> {
    // Low stock: product+outlet groups whose summed active balance < minimum_stock
    const lowStock = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM (
         SELECT b.product_id, b.outlet_id
         FROM inventory_batches b
         JOIN products p ON p.id = b.product_id
         WHERE b.company_id = $1 AND b.status = 'ACTIVE'
           AND p.minimum_stock > 0
           ${outletId ? 'AND b.outlet_id = $2' : ''}
         GROUP BY b.product_id, b.outlet_id, p.minimum_stock
         HAVING SUM(b.qty_available) < p.minimum_stock
       ) AS low`,
      outletId ? [companyId, outletId] : [companyId],
    );

    // Expired batches
    const expired = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM inventory_batches
       WHERE company_id = $1
         AND status = 'ACTIVE'
         AND qty_available > 0
         AND expired_date IS NOT NULL
         AND expired_date < $2::date
         ${outletId ? 'AND outlet_id = $3' : ''}`,
      outletId ? [companyId, bizDate, outletId] : [companyId, bizDate],
    );

    return {
      lowStockCount: parseInt(lowStock.rows[0].count, 10),
      expiredCount: parseInt(expired.rows[0].count, 10),
    };
  }

  private async getSalesTrend(
    companyId: string,
    startDate: string,
    endDate: string,
    outletId?: string,
  ): Promise<SalesTrendPoint[]> {
    const result = await this.pool.query<{
      date: string;
      revenue: string;
      order_count: string;
    }>(
      `SELECT
         DATE(paid_at + interval '7 hours') AS date,
         COALESCE(SUM(grand_total), 0) AS revenue,
         COUNT(*) AS order_count
       FROM sales_orders
       WHERE company_id = $1
         AND status = 'PAID'
         AND DATE(paid_at + interval '7 hours') BETWEEN $2::date AND $3::date
         ${outletId ? 'AND outlet_id = $4' : ''}
       GROUP BY DATE(paid_at + interval '7 hours')
       ORDER BY date`,
      outletId ? [companyId, startDate, endDate, outletId] : [companyId, startDate, endDate],
    );

    return result.rows.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      orderCount: parseInt(row.order_count, 10),
    }));
  }

  private async getExpiringSoonBatches(
    companyId: string,
    bizDate: string,
    soonDate: string,
    outletId?: string,
    limit: number = 10,
  ): Promise<ExpiringBatch[]> {
    const result = await this.pool.query<{
      product_id: string;
      product_name: string;
      batch_no: string;
      expiry_date: string;
      qty: string;
      uom_name: string;
    }>(
      `SELECT
         b.product_id,
         p.name AS product_name,
         b.batch_number AS batch_no,
         b.expired_date AS expiry_date,
         b.qty_available AS qty,
         u.name AS uom_name
       FROM inventory_batches b
       JOIN products p ON p.id = b.product_id
       JOIN uoms u ON u.id = p.uom_id
       WHERE b.company_id = $1
         AND b.status = 'ACTIVE'
         AND b.qty_available > 0
         AND b.expired_date IS NOT NULL
         AND b.expired_date >= $2::date
         AND b.expired_date <= $3::date
         ${outletId ? 'AND b.outlet_id = $5' : ''}
       ORDER BY b.expired_date ASC
       LIMIT $4`,
      outletId
        ? [companyId, bizDate, soonDate, limit, outletId]
        : [companyId, bizDate, soonDate, limit],
    );

    return result.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      batchNo: row.batch_no,
      expiryDate: row.expiry_date,
      qty: parseFloat(row.qty),
      uomName: row.uom_name,
    }));
  }

  private async getTopSellingProducts(
    companyId: string,
    startDate: string,
    endDate: string,
    outletId?: string,
    limit: number = 10,
  ): Promise<TopSellingProduct[]> {
    const result = await this.pool.query<{
      product_id: string;
      product_name: string;
      topping_names: string[];
      qty_sold: string;
      revenue: string;
    }>(
      `SELECT
         soi.product_id,
         soi.product_name_snapshot AS product_name,
         topping.topping_names,
         SUM(soi.qty) AS qty_sold,
         SUM(soi.line_total) AS revenue
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.sales_order_id
       LEFT JOIN LATERAL (
         SELECT COALESCE(
           ARRAY_AGG(sot.topping_name_snapshot ORDER BY sot.topping_name_snapshot),
           ARRAY[]::varchar[]
         ) AS topping_names
         FROM sales_order_item_toppings sot
         WHERE sot.sales_order_item_id = soi.id
       ) topping ON TRUE
       WHERE so.company_id = $1
         AND so.status = 'PAID'
         AND DATE(so.paid_at + interval '7 hours') BETWEEN $2::date AND $3::date
         ${outletId ? 'AND so.outlet_id = $5' : ''}
       GROUP BY soi.product_id, soi.product_name_snapshot, topping.topping_names
       ORDER BY qty_sold DESC, product_name, topping.topping_names
       LIMIT $4`,
      outletId
        ? [companyId, startDate, endDate, limit, outletId]
        : [companyId, startDate, endDate, limit],
    );

    return result.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      toppingNames: row.topping_names,
      qtySold: parseFloat(row.qty_sold),
      revenue: parseFloat(row.revenue),
    }));
  }

  private async getOutletSalesMetrics(
    companyId: string,
    outletId: string,
    bizDate: string,
  ): Promise<{ revenueToday: number; salesToday: number }> {
    const result = await this.pool.query<{ revenue: string; count: string }>(
      `SELECT
         COALESCE(SUM(grand_total), 0) AS revenue,
         COUNT(*) AS count
       FROM sales_orders
       WHERE company_id = $1
         AND outlet_id = $2
         AND status = 'PAID'
         AND DATE(paid_at + interval '7 hours') = $3::date`,
      [companyId, outletId, bizDate],
    );

    return {
      revenueToday: parseFloat(result.rows[0].revenue),
      salesToday: parseInt(result.rows[0].count, 10),
    };
  }

  private async getOutletInventoryMetrics(
    companyId: string,
    outletId: string,
    bizDate: string,
    soonDate: string,
  ): Promise<{ lowStockCount: number }> {
    // Low stock for this outlet
    const lowStock = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM (
         SELECT b.product_id
         FROM inventory_batches b
         JOIN products p ON p.id = b.product_id
         WHERE b.company_id = $1
           AND b.outlet_id = $2
           AND b.status = 'ACTIVE'
           AND p.minimum_stock > 0
         GROUP BY b.product_id, p.minimum_stock
         HAVING SUM(b.qty_available) < p.minimum_stock
       ) AS low`,
      [companyId, outletId],
    );

    return {
      lowStockCount: parseInt(lowStock.rows[0].count, 10),
    };
  }

  private async getOutletName(outletId: string): Promise<string> {
    const result = await this.pool.query<{ name: string }>(
      `SELECT name FROM outlets WHERE id = $1`,
      [outletId],
    );

    return result.rows[0]?.name || 'Unknown Outlet';
  }
}
