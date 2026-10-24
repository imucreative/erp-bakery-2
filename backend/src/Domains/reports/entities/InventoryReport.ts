/**
 * Inventory Report entities — read value objects for stock analytics.
 * Filtered by outlet and product.
 */

export interface InventoryReportSummary {
  totalProducts: number;
  totalBatches: number;
  totalStockValue: number;
  lowStockCount: number;
  expiredCount: number;
}

export interface InventoryReportProductRow {
  productId: string;
  productName: string;
  sku: string;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  batchCount: number;
  earliestExpiry: string | null; // ISO date string or null
  stockValue: number;
}

/**
 * Inventory Report — stock on hand per product dengan batch details.
 * Response structure: summary + per-product breakdown.
 */
export class InventoryReport {
  public readonly summary: InventoryReportSummary;
  public readonly details: InventoryReportProductRow[];

  constructor(payload: {
    summary: InventoryReportSummary;
    details: InventoryReportProductRow[];
  }) {
    this.summary = payload.summary;
    this.details = payload.details;
  }
}

export interface InventoryReportFilter {
  outletId?: string;
  productId?: string;
  includeExpired?: boolean; // default: false
}
