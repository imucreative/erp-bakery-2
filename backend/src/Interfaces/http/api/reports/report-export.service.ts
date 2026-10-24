import { Injectable } from '@nestjs/common';
import { SalesReport } from '../../../../Domains/reports/entities/SalesReport';
import { InventoryReport } from '../../../../Domains/reports/entities/InventoryReport';
import { ProductionReport } from '../../../../Domains/reports/entities/ProductionReport';

/**
 * ReportExportService — CSV generation untuk reports (doc 54).
 * PDF export deferred ke Phase 4 (client-side jsPDF).
 */
@Injectable()
export class ReportExportService {
  /**
   * Export Sales Report ke CSV format.
   * Structure: Summary + Daily Breakdown + Top Products
   */
  exportSalesToCsv(report: SalesReport): string {
    const lines: string[] = [];

    // Summary section
    lines.push('SALES REPORT SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total Orders,${report.summary.totalOrders}`);
    lines.push(`Total Revenue,${report.summary.totalRevenue}`);
    lines.push(`Average Order Value,${report.summary.averageOrderValue}`);
    lines.push(`Total Items Sold,${report.summary.totalItemsSold}`);
    lines.push('');

    // Daily breakdown section
    lines.push('DAILY BREAKDOWN');
    lines.push('Date,Outlet,Order Count,Revenue,Items Sold');
    for (const row of report.details) {
      lines.push(
        `${row.date},"${row.outletName}",${row.orderCount},${row.revenue},${row.itemsSold}`,
      );
    }
    lines.push('');

    // Top products section
    lines.push('TOP SELLING PRODUCTS');
    lines.push('Product,Qty Sold,Revenue');
    for (const row of report.topProducts) {
      lines.push(`"${row.productName}",${row.qtySold},${row.revenue}`);
    }

    return lines.join('\n');
  }

  /**
   * Export Inventory Report ke CSV format.
   * Structure: Summary + Product Rows
   */
  exportInventoryToCsv(report: InventoryReport): string {
    const lines: string[] = [];

    // Summary section
    lines.push('INVENTORY REPORT SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total Products,${report.summary.totalProducts}`);
    lines.push(`Total Batches,${report.summary.totalBatches}`);
    lines.push(`Total Stock Value,${report.summary.totalStockValue}`);
    lines.push(`Low Stock Count,${report.summary.lowStockCount}`);
    lines.push(`Expired Count,${report.summary.expiredCount}`);
    lines.push('');

    // Product rows section
    lines.push('PRODUCT DETAILS');
    lines.push('Product,SKU,Total Qty,Available Qty,Reserved Qty,Batch Count,Earliest Expiry,Stock Value');
    for (const row of report.details) {
      lines.push(
        `"${row.productName}","${row.sku}",${row.totalQty},${row.availableQty},${row.reservedQty},${row.batchCount},${row.earliestExpiry || 'N/A'},${row.stockValue}`,
      );
    }

    return lines.join('\n');
  }

  /**
   * Export Production Report ke CSV format.
   * Structure: Summary + Daily Breakdown per Recipe
   */
  exportProductionToCsv(report: ProductionReport): string {
    const lines: string[] = [];

    // Summary section
    lines.push('PRODUCTION REPORT SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total Orders,${report.summary.totalOrders}`);
    lines.push(`Total Produced,${report.summary.totalProduced}`);
    lines.push(`Total Waste,${report.summary.totalWaste}`);
    lines.push(`Average Yield,${report.summary.averageYield.toFixed(2)}%`);
    lines.push('');

    // Daily breakdown section
    lines.push('DAILY BREAKDOWN');
    lines.push('Date,Outlet,Recipe,Planned Qty,Produced Qty,Waste Qty,Yield %');
    for (const row of report.details) {
      lines.push(
        `${row.date},"${row.outletName}","${row.recipeName}",${row.plannedQty},${row.producedQty},${row.wasteQty},${row.yield.toFixed(2)}`,
      );
    }

    return lines.join('\n');
  }
}
