/**
 * Production Report entities — read value objects for production analytics.
 * Filtered by date range, outlet, and recipe.
 */

export interface ProductionReportSummary {
  totalOrders: number;
  totalProduced: number;
  totalWaste: number;
  averageYield: number; // percentage
}

export interface ProductionReportDailyBreakdown {
  date: string; // ISO date string (YYYY-MM-DD)
  outletId: string;
  outletName: string;
  recipeId: string;
  recipeName: string;
  plannedQty: number;
  producedQty: number;
  wasteQty: number;
  yield: number; // percentage
}

/**
 * Production Report — agregasi produksi dengan filter date range + outlet + recipe.
 * Response structure: summary + daily breakdown per recipe.
 */
export class ProductionReport {
  public readonly summary: ProductionReportSummary;
  public readonly details: ProductionReportDailyBreakdown[];

  constructor(payload: {
    summary: ProductionReportSummary;
    details: ProductionReportDailyBreakdown[];
  }) {
    this.summary = payload.summary;
    this.details = payload.details;
  }
}

export interface ProductionReportFilter {
  dateFrom: string; // ISO date string
  dateTo: string; // ISO date string
  outletId?: string;
  recipeId?: string;
}
