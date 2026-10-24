/**
 * Sales Report entities — read value objects for sales analytics.
 * Filtered by date range, outlet, and status.
 */

export interface SalesReportSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalItemsSold: number;
}

export interface SalesReportDailyBreakdown {
  date: string; // ISO date string (YYYY-MM-DD)
  outletId: string;
  outletName: string;
  orderCount: number;
  revenue: number;
  itemsSold: number;
}

export interface SalesReportTopProduct {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: number;
}

/**
 * Sales Report — agregasi penjualan dengan filter date range + outlet.
 * Response structure: summary + daily breakdown + top products.
 */
export class SalesReport {
  public readonly summary: SalesReportSummary;
  public readonly details: SalesReportDailyBreakdown[];
  public readonly topProducts: SalesReportTopProduct[];

  constructor(payload: {
    summary: SalesReportSummary;
    details: SalesReportDailyBreakdown[];
    topProducts: SalesReportTopProduct[];
  }) {
    this.summary = payload.summary;
    this.details = payload.details;
    this.topProducts = payload.topProducts;
  }
}

export interface SalesReportFilter {
  dateFrom: string; // ISO date string
  dateTo: string; // ISO date string
  outletId?: string;
  status?: string; // PAID, REFUNDED, CANCELLED (default: PAID)
}
