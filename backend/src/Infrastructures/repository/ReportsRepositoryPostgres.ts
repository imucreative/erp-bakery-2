import { Pool } from 'pg';
import { ReportsRepository } from '../../Domains/reports/ReportsRepository';
import {
  SalesReport,
  SalesReportFilter,
  SalesReportSummary,
  SalesReportDailyBreakdown,
  SalesReportTopProduct,
} from '../../Domains/reports/entities/SalesReport';
import {
  InventoryReport,
  InventoryReportFilter,
  InventoryReportSummary,
  InventoryReportProductRow,
} from '../../Domains/reports/entities/InventoryReport';
import {
  ProductionReport,
  ProductionReportFilter,
  ProductionReportSummary,
  ProductionReportDailyBreakdown,
} from '../../Domains/reports/entities/ProductionReport';

/**
 * PostgreSQL implementation — ReportsRepository (doc 54).
 * Read-only aggregates dari Sales, Inventory, Production tables.
 */
export class ReportsRepositoryPostgres extends ReportsRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async getSalesReport(
    companyId: string,
    filter: SalesReportFilter,
  ): Promise<SalesReport> {
    const status = filter.status || 'PAID';

    // Parallel queries untuk performance
    const [summary, details, topProducts] = await Promise.all([
      this.getSalesSummary(companyId, filter, status),
      this.getSalesDailyBreakdown(companyId, filter, status),
      this.getSalesTopProducts(companyId, filter, status),
    ]);

    return new SalesReport({ summary, details, topProducts });
  }

  async getInventoryReport(
    companyId: string,
    filter: InventoryReportFilter,
  ): Promise<InventoryReport> {
    // Parallel queries
    const [summary, details] = await Promise.all([
      this.getInventorySummary(companyId, filter),
      this.getInventoryProductRows(companyId, filter),
    ]);

    return new InventoryReport({ summary, details });
  }

  async getProductionReport(
    companyId: string,
    filter: ProductionReportFilter,
  ): Promise<ProductionReport> {
    // Parallel queries
    const [summary, details] = await Promise.all([
      this.getProductionSummary(companyId, filter),
      this.getProductionDailyBreakdown(companyId, filter),
    ]);

    return new ProductionReport({ summary, details });
  }

  // ─── Sales Report Queries ─────────────────────────────────────────────────

  private async getSalesSummary(
    companyId: string,
    filter: SalesReportFilter,
    status: string,
  ): Promise<SalesReportSummary> {
    const outletFilter = filter.outletId ? 'AND outlet_id = $3' : '';
    const params: unknown[] = [companyId, status, filter.dateFrom, filter.dateTo];
    if (filter.outletId) params.splice(2, 0, filter.outletId);

    const result = await this.pool.query<{
      total_orders: string;
      total_revenue: string;
      avg_order_value: string;
      total_items: string;
    }>(
      `SELECT
         COUNT(*) AS total_orders,
         COALESCE(SUM(grand_total), 0) AS total_revenue,
         COALESCE(AVG(grand_total), 0) AS avg_order_value,
         COALESCE(SUM(item_count), 0) AS total_items
       FROM sales_orders
       WHERE company_id = $1
         AND status = $2
         AND DATE(paid_at AT TIME ZONE 'Asia/Jakarta') BETWEEN $${params.length - 1}::date AND $${params.length}::date
         ${outletFilter}`,
      params,
    );

    const row = result.rows[0];
    return {
      totalOrders: parseInt(row.total_orders, 10),
      totalRevenue: parseFloat(row.total_revenue),
      averageOrderValue: parseFloat(row.avg_order_value),
      totalItemsSold: parseInt(row.total_items, 10),
    };
  }

  private async getSalesDailyBreakdown(
    companyId: string,
    filter: SalesReportFilter,
    status: string,
  ): Promise<SalesReportDailyBreakdown[]> {
    const outletFilter = filter.outletId ? 'AND so.outlet_id = $3' : '';
    const params: unknown[] = [companyId, status, filter.dateFrom, filter.dateTo];
    if (filter.outletId) params.splice(2, 0, filter.outletId);

    const result = await this.pool.query<{
      date: string;
      outlet_id: string;
      outlet_name: string;
      order_count: string;
      revenue: string;
      items_sold: string;
    }>(
      `SELECT
         DATE(so.paid_at AT TIME ZONE 'Asia/Jakarta') AS date,
         so.outlet_id,
         o.name AS outlet_name,
         COUNT(*) AS order_count,
         COALESCE(SUM(so.grand_total), 0) AS revenue,
         COALESCE(SUM(so.item_count), 0) AS items_sold
       FROM sales_orders so
       JOIN outlets o ON o.id = so.outlet_id
       WHERE so.company_id = $1
         AND so.status = $2
         AND DATE(so.paid_at AT TIME ZONE 'Asia/Jakarta') BETWEEN $${params.length - 1}::date AND $${params.length}::date
         ${outletFilter}
       GROUP BY DATE(so.paid_at AT TIME ZONE 'Asia/Jakarta'), so.outlet_id, o.name
       ORDER BY date`,
      params,
    );

    return result.rows.map((row) => ({
      date: row.date,
      outletId: row.outlet_id,
      outletName: row.outlet_name,
      orderCount: parseInt(row.order_count, 10),
      revenue: parseFloat(row.revenue),
      itemsSold: parseInt(row.items_sold, 10),
    }));
  }

  private async getSalesTopProducts(
    companyId: string,
    filter: SalesReportFilter,
    status: string,
    limit: number = 10,
  ): Promise<SalesReportTopProduct[]> {
    const outletFilter = filter.outletId ? 'AND so.outlet_id = $3' : '';
    const params: unknown[] = [
      companyId,
      status,
      filter.dateFrom,
      filter.dateTo,
      limit,
    ];
    if (filter.outletId) params.splice(2, 0, filter.outletId);

    const result = await this.pool.query<{
      product_id: string;
      product_name: string;
      qty_sold: string;
      revenue: string;
    }>(
      `SELECT
         soi.product_id,
         soi.product_name_snapshot AS product_name,
         SUM(soi.qty) AS qty_sold,
         SUM(soi.line_total) AS revenue
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.sales_order_id
       WHERE so.company_id = $1
         AND so.status = $2
         AND DATE(so.paid_at AT TIME ZONE 'Asia/Jakarta') BETWEEN $${params.length - 2}::date AND $${params.length - 1}::date
         ${outletFilter}
       GROUP BY soi.product_id, soi.product_name_snapshot
       ORDER BY qty_sold DESC
       LIMIT $${params.length}`,
      params,
    );

    return result.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      qtySold: parseFloat(row.qty_sold),
      revenue: parseFloat(row.revenue),
    }));
  }

  // ─── Inventory Report Queries ─────────────────────────────────────────────

  private async getInventorySummary(
    companyId: string,
    filter: InventoryReportFilter,
  ): Promise<InventoryReportSummary> {
    const outletFilter = filter.outletId ? 'AND b.outlet_id = $2' : '';
    const productFilter = filter.productId ? `AND b.product_id = $${filter.outletId ? 3 : 2}` : '';
    const expiredFilter = filter.includeExpired ? '' : "AND (b.expired_date IS NULL OR b.expired_date >= CURRENT_DATE)";

    const params: unknown[] = [companyId];
    if (filter.outletId) params.push(filter.outletId);
    if (filter.productId) params.push(filter.productId);

    const result = await this.pool.query<{
      total_products: string;
      total_batches: string;
      total_stock_value: string;
      low_stock_count: string;
      expired_count: string;
    }>(
      `SELECT
         COUNT(DISTINCT b.product_id) AS total_products,
         COUNT(DISTINCT b.id) AS total_batches,
         COALESCE(SUM(b.qty_available * p.selling_price), 0) AS total_stock_value,
         (SELECT COUNT(*) FROM (
           SELECT b2.product_id, b2.outlet_id
           FROM inventory_batches b2
           JOIN products p2 ON p2.id = b2.product_id
           WHERE b2.company_id = $1 AND b2.status = 'ACTIVE' ${outletFilter} ${productFilter}
             AND p2.minimum_stock > 0
           GROUP BY b2.product_id, b2.outlet_id, p2.minimum_stock
           HAVING SUM(b2.qty_available) < p2.minimum_stock
         ) AS low) AS low_stock_count,
         COUNT(*) FILTER (WHERE b.expired_date IS NOT NULL AND b.expired_date < CURRENT_DATE) AS expired_count
       FROM inventory_batches b
       JOIN products p ON p.id = b.product_id
       WHERE b.company_id = $1
         AND b.status = 'ACTIVE'
         ${outletFilter}
         ${productFilter}
         ${expiredFilter}`,
      params,
    );

    const row = result.rows[0];
    return {
      totalProducts: parseInt(row.total_products, 10),
      totalBatches: parseInt(row.total_batches, 10),
      totalStockValue: parseFloat(row.total_stock_value),
      lowStockCount: parseInt(row.low_stock_count, 10),
      expiredCount: parseInt(row.expired_count, 10),
    };
  }

  private async getInventoryProductRows(
    companyId: string,
    filter: InventoryReportFilter,
  ): Promise<InventoryReportProductRow[]> {
    const outletFilter = filter.outletId ? 'AND b.outlet_id = $2' : '';
    const productFilter = filter.productId ? `AND b.product_id = $${filter.outletId ? 3 : 2}` : '';
    const expiredFilter = filter.includeExpired ? '' : "AND (b.expired_date IS NULL OR b.expired_date >= CURRENT_DATE)";

    const params: unknown[] = [companyId];
    if (filter.outletId) params.push(filter.outletId);
    if (filter.productId) params.push(filter.productId);

    const result = await this.pool.query<{
      product_id: string;
      product_name: string;
      sku: string;
      total_qty: string;
      available_qty: string;
      reserved_qty: string;
      batch_count: string;
      earliest_expiry: string | null;
      stock_value: string;
    }>(
      `SELECT
         p.id AS product_id,
         p.name AS product_name,
         p.sku,
         COALESCE(SUM(b.qty_available), 0) AS total_qty,
         COALESCE(SUM(b.qty_available) FILTER (WHERE b.status = 'ACTIVE'), 0) AS available_qty,
         COALESCE(SUM(b.qty_available) FILTER (WHERE b.status = 'RESERVED'), 0) AS reserved_qty,
         COUNT(DISTINCT b.id) AS batch_count,
         MIN(b.expired_date) AS earliest_expiry,
         COALESCE(SUM(b.qty_available * p.selling_price), 0) AS stock_value
       FROM products p
       LEFT JOIN inventory_batches b ON b.product_id = p.id
       WHERE p.company_id = $1
         ${outletFilter}
         ${productFilter}
         ${expiredFilter}
       GROUP BY p.id, p.name, p.sku
       ORDER BY p.name`,
      params,
    );

    return result.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      totalQty: parseFloat(row.total_qty),
      availableQty: parseFloat(row.available_qty),
      reservedQty: parseFloat(row.reserved_qty),
      batchCount: parseInt(row.batch_count, 10),
      earliestExpiry: row.earliest_expiry,
      stockValue: parseFloat(row.stock_value),
    }));
  }

  // ─── Production Report Queries ────────────────────────────────────────────

  private async getProductionSummary(
    companyId: string,
    filter: ProductionReportFilter,
  ): Promise<ProductionReportSummary> {
    const outletFilter = filter.outletId ? 'AND po.outlet_id = $3' : '';
    const recipeFilter = filter.recipeId ? `AND po.recipe_id = $${filter.outletId ? 4 : 3}` : '';

    const params: unknown[] = [companyId, filter.dateFrom, filter.dateTo];
    if (filter.outletId) params.splice(2, 0, filter.outletId);
    if (filter.recipeId) params.push(filter.recipeId);

    const result = await this.pool.query<{
      total_orders: string;
      total_produced: string;
      total_waste: string;
      avg_yield: string;
    }>(
      `SELECT
         COUNT(*) AS total_orders,
         COALESCE(SUM(po.planned_qty), 0) AS total_produced,
         COALESCE(SUM(po.waste_qty), 0) AS total_waste,
         CASE
           WHEN SUM(po.planned_qty) > 0
           THEN ((SUM(po.planned_qty) - SUM(po.waste_qty)) * 100.0 / SUM(po.planned_qty))
           ELSE 0
         END AS avg_yield
       FROM production_orders po
       WHERE po.company_id = $1
         AND DATE(po.created_at AT TIME ZONE 'Asia/Jakarta') BETWEEN $2::date AND $3::date
         ${outletFilter}
         ${recipeFilter}`,
      params,
    );

    const row = result.rows[0];
    return {
      totalOrders: parseInt(row.total_orders, 10),
      totalProduced: parseFloat(row.total_produced),
      totalWaste: parseFloat(row.total_waste),
      averageYield: parseFloat(row.avg_yield),
    };
  }

  private async getProductionDailyBreakdown(
    companyId: string,
    filter: ProductionReportFilter,
  ): Promise<ProductionReportDailyBreakdown[]> {
    const outletFilter = filter.outletId ? 'AND po.outlet_id = $3' : '';
    const recipeFilter = filter.recipeId ? `AND po.recipe_id = $${filter.outletId ? 4 : 3}` : '';

    const params: unknown[] = [companyId, filter.dateFrom, filter.dateTo];
    if (filter.outletId) params.splice(2, 0, filter.outletId);
    if (filter.recipeId) params.push(filter.recipeId);

    const result = await this.pool.query<{
      date: string;
      outlet_id: string;
      outlet_name: string;
      recipe_id: string;
      recipe_name: string;
      planned_qty: string;
      produced_qty: string;
      waste_qty: string;
      yield: string;
    }>(
      `SELECT
         DATE(po.created_at AT TIME ZONE 'Asia/Jakarta') AS date,
         po.outlet_id,
         o.name AS outlet_name,
         po.recipe_id,
         r.name AS recipe_name,
         COALESCE(SUM(po.planned_qty), 0) AS planned_qty,
         COALESCE(SUM(po.planned_qty - po.waste_qty), 0) AS produced_qty,
         COALESCE(SUM(po.waste_qty), 0) AS waste_qty,
         CASE
           WHEN SUM(po.planned_qty) > 0
           THEN ((SUM(po.planned_qty) - SUM(po.waste_qty)) * 100.0 / SUM(po.planned_qty))
           ELSE 0
         END yield
       FROM production_orders po
       JOIN outlets o ON o.id = po.outlet_id
       JOIN recipes r ON r.id = po.recipe_id
       WHERE po.company_id = $1
         AND DATE(po.created_at AT TIME ZONE 'Asia/Jakarta') BETWEEN $2::date AND $3::date
         ${outletFilter}
         ${recipeFilter}
       GROUP BY DATE(po.created_at AT TIME ZONE 'Asia/Jakarta'), po.outlet_id, o.name, po.recipe_id, r.name
       ORDER BY date`,
      params,
    );

    return result.rows.map((row) => ({
      date: row.date,
      outletId: row.outlet_id,
      outletName: row.outlet_name,
      recipeId: row.recipe_id,
      recipeName: row.recipe_name,
      plannedQty: parseFloat(row.planned_qty),
      producedQty: parseFloat(row.produced_qty),
      wasteQty: parseFloat(row.waste_qty),
      yield: parseFloat(row.yield),
    }));
  }
}
