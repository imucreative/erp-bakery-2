/**
 * Dashboard domain entities — read value objects for dashboard metrics.
 * Company-scoped aggregates for Owner and Outlet dashboards.
 */

export interface SalesTrendPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  revenue: number;
  orderCount: number;
}

export interface ExpiringBatch {
  productId: string;
  productName: string;
  batchNo: string;
  expiryDate: string; // ISO date string
  qty: number;
  uomName: string;
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  toppingNames: string[];
  qtySold: number;
  revenue: number;
}

/**
 * Owner Dashboard Summary — agregasi metrik company-wide.
 * Reuse InventoryDashboardSummary untuk low stock & expired,
 * tambahkan sales metrics (revenue, transactions, trends, top products).
 */
export class OwnerDashboardSummary {
  public readonly revenueToday: number;
  public readonly salesToday: number;
  public readonly lowStockCount: number;
  public readonly expiredCount: number;
  public readonly salesTrend: SalesTrendPoint[];
  public readonly expiringSoon: ExpiringBatch[];
  public readonly topProducts: TopSellingProduct[];

  constructor(payload: {
    revenueToday: number;
    salesToday: number;
    lowStockCount: number;
    expiredCount: number;
    salesTrend: SalesTrendPoint[];
    expiringSoon: ExpiringBatch[];
    topProducts: TopSellingProduct[];
  }) {
    this.revenueToday = payload.revenueToday;
    this.salesToday = payload.salesToday;
    this.lowStockCount = payload.lowStockCount;
    this.expiredCount = payload.expiredCount;
    this.salesTrend = payload.salesTrend;
    this.expiringSoon = payload.expiringSoon;
    this.topProducts = payload.topProducts;
  }
}

/**
 * Outlet Dashboard Summary — varian ringkas dari Owner, scoped ke satu outlet.
 */
export class OutletDashboardSummary {
  public readonly outletId: string;
  public readonly outletName: string;
  public readonly salesToday: number;
  public readonly revenueToday: number;
  public readonly lowStockCount: number;
  public readonly pendingRequests: number; // placeholder untuk replenishment

  constructor(payload: {
    outletId: string;
    outletName: string;
    salesToday: number;
    revenueToday: number;
    lowStockCount: number;
    pendingRequests: number;
  }) {
    this.outletId = payload.outletId;
    this.outletName = payload.outletName;
    this.salesToday = payload.salesToday;
    this.revenueToday = payload.revenueToday;
    this.lowStockCount = payload.lowStockCount;
    this.pendingRequests = payload.pendingRequests;
  }
}
