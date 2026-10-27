import { ReportExportService } from '../report-export.service';
import { SalesReport, SalesReportTopProduct } from '../../../../../Domains/reports/entities/SalesReport';

const variant: SalesReportTopProduct = {
  productId: 'waffle-id',
  productName: 'Waffle Original',
  toppingNames: ['Cokelat', 'Keju'],
  qtySold: 6,
  revenue: 120000,
};

function exportRows(rows: SalesReportTopProduct[]): string {
  return new ReportExportService().exportSalesToCsv(
    new SalesReport({
      summary: {
        totalOrders: 2,
        totalRevenue: 120000,
        averageOrderValue: 60000,
        totalItemsSold: 6,
      },
      details: [],
      topProducts: rows,
    }),
  );
}

describe('ReportExportService sales topping combinations', () => {
  it('exports each combination with topping, quantity and whole-item revenue', () => {
    const csv = exportRows([variant]);
    expect(csv).toContain('Product,Topping,Qty Sold,Revenue');
    expect(csv).toContain('"Waffle Original","Cokelat + Keju",6,120000');
    expect(csv).toContain('Total Revenue,120000');
  });

  it('labels items with no topping and keeps separate variants of the same waffle', () => {
    const csv = exportRows([variant, { ...variant, toppingNames: [], qtySold: 4 }]);
    expect(csv).toContain('"Waffle Original","Tanpa topping",4,120000');
    expect(csv.match(/"Waffle Original"/g)).toHaveLength(2);
  });

  it('quotes commas and doubles quotes in product and topping names', () => {
    const csv = exportRows([
      { ...variant, productName: 'Waffle "Premium", Besar', toppingNames: ['Selai "Berry", Manis'] },
    ]);
    expect(csv).toContain('"Waffle ""Premium"", Besar","Selai ""Berry"", Manis",6,120000');
  });

  it.each(['=1+1', '+1+1', '-1+1', '@SUM(1)', '\t=1+1', '\r=1+1', '\n=1+1'])(
    'neutralizes spreadsheet formula names %j',
    (name) => {
      const csv = exportRows([{ ...variant, productName: name, toppingNames: [name] }]);
      expect(csv).toContain(`"'${name}","'${name}",6,120000`);
    },
  );

  it('still exports summary and headers with no sales', () => {
    const csv = exportRows([]);
    expect(csv).toContain('Product,Topping,Qty Sold,Revenue');
    expect(csv).not.toContain('"Waffle Original"');
  });
});
