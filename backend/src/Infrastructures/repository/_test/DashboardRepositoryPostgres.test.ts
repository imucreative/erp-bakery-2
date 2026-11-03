import { Pool } from 'pg';
import { DashboardRepositoryPostgres } from '../DashboardRepositoryPostgres';

const mockPool = { query: jest.fn() } as unknown as Pool;
const query = mockPool.query as jest.Mock;

const companyId = 'c1';
const outletId = 'o1';
const businessDate = new Date('2026-10-25T03:00:00.000Z');

/** Resolve each aggregate query with a shape its mapper can consume. */
function stubAggregates(topProductRows: unknown[] = []): void {
  query.mockImplementation((sql: string) => {
    if (sql.includes('FROM sales_order_items soi')) {
      return Promise.resolve({ rows: topProductRows });
    }
    if (sql.includes('COUNT(*) AS count')) {
      return Promise.resolve({ rows: [{ count: '0', revenue: '0' }] });
    }
    if (sql.includes('AS revenue')) {
      return Promise.resolve({ rows: [{ revenue: '0', count: '0' }] });
    }
    return Promise.resolve({ rows: [] });
  });
}

/** Grab the (sql, params) pair of the call whose SQL contains `marker`. */
function callWith(marker: string): [string, unknown[]] {
  const call = query.mock.calls.find(([sql]) => (sql as string).includes(marker));
  if (!call) throw new Error(`No query matched marker: ${marker}`);
  return call as [string, unknown[]];
}

describe('DashboardRepositoryPostgres.getOwnerSummary', () => {
  let repo: DashboardRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    stubAggregates();
    repo = new DashboardRepositoryPostgres(mockPool);
  });

  describe('company-wide (no outlet)', () => {
    beforeEach(async () => {
      await repo.getOwnerSummary(companyId, {}, businessDate);
    });

    it('should not filter any aggregate by outlet', () => {
      for (const [sql] of query.mock.calls) {
        expect(sql as string).not.toMatch(/outlet_id = \$/);
      }
    });

    it('should scope every aggregate to the company', () => {
      for (const [, params] of query.mock.calls) {
        expect((params as unknown[])[0]).toBe(companyId);
      }
    });
  });

  describe('scoped to one outlet', () => {
    beforeEach(async () => {
      await repo.getOwnerSummary(companyId, { outletId }, businessDate);
    });

    it('should filter today sales metrics by outlet', () => {
      const [sql, params] = callWith("DATE(paid_at + interval '7 hours') = $2");
      expect(sql).toContain('AND outlet_id = $3');
      expect(params).toEqual([companyId, '2026-10-25', outletId]);
    });

    it('should filter the low stock aggregate by outlet', () => {
      const [sql, params] = callWith('HAVING SUM(b.qty_available) < p.minimum_stock');
      expect(sql).toContain('AND b.outlet_id = $2');
      expect(params).toEqual([companyId, outletId]);
    });

    it('should filter the expired batch count by outlet', () => {
      const [sql, params] = callWith('AND expired_date < $2::date');
      expect(sql).toContain('AND outlet_id = $3');
      expect(params).toEqual([companyId, '2026-10-25', outletId]);
    });

    it('should filter the sales trend by outlet', () => {
      const [sql, params] = callWith('GROUP BY DATE(paid_at');
      expect(sql).toContain('AND outlet_id = $4');
      expect(params).toEqual([companyId, '2026-10-19', '2026-10-25', outletId]);
    });

    it('should filter expiring batches by outlet without displacing the limit', () => {
      const [sql, params] = callWith('b.batch_number AS batch_no');
      expect(sql).toContain('AND b.outlet_id = $5');
      expect(sql).toContain('LIMIT $4');
      expect(params).toEqual([companyId, '2026-10-25', '2026-11-24', 10, outletId]);
    });

    it('should filter top selling products by outlet without displacing the limit', () => {
      const [sql, params] = callWith('soi.product_name_snapshot');
      expect(sql).toContain('AND so.outlet_id = $5');
      expect(sql).toContain('LIMIT $4');
      expect(params).toEqual([companyId, '2026-10-19', '2026-10-25', 10, outletId]);
    });
  });

  it('should apply a custom period and top-products limit', async () => {
    await repo.getOwnerSummary(
      companyId,
      { periodDays: 30, topProductsLimit: 20 },
      businessDate,
    );

    const [, trendParams] = callWith('GROUP BY DATE(paid_at');
    const [, topProductParams] = callWith('FROM sales_order_items soi');
    expect(trendParams).toEqual([companyId, '2026-09-26', '2026-10-25']);
    expect(topProductParams).toEqual([companyId, '2026-09-26', '2026-10-25', 20]);
  });

  describe('waffle and topping combinations', () => {
    it.each([
      { label: 'no toppings', toppingNames: [] },
      { label: 'one topping', toppingNames: ['Synthetic Cocoa'] },
      { label: 'multiple toppings', toppingNames: ['Synthetic Berry', 'Synthetic Cocoa'] },
    ])('should map $label and numeric aggregates', async ({ toppingNames }) => {
      const productId = '00000000-0000-4000-8000-000000000001';
      stubAggregates([{
        product_id: productId,
        product_name: 'Synthetic Waffle Snapshot',
        topping_names: toppingNames,
        qty_sold: '2.750',
        revenue: '12345.67',
      }]);

      const summary = await repo.getOwnerSummary(companyId, {}, businessDate);

      expect(summary.topProducts).toEqual([{
        productId,
        productName: 'Synthetic Waffle Snapshot',
        toppingNames,
        qtySold: 2.75,
        revenue: 12345.67,
      }]);
    });

    it('should map an empty result to an empty top-products list', async () => {
      const summary = await repo.getOwnerSummary(companyId, {}, businessDate);
      expect(summary.topProducts).toEqual([]);
    });

    it('should aggregate sorted snapshot names once per item with an empty-array fallback', async () => {
      await repo.getOwnerSummary(companyId, {}, businessDate);
      const [sql] = callWith('FROM sales_order_items soi');

      expect(sql).toMatch(/LEFT JOIN LATERAL\s*\(/);
      expect(sql).toMatch(
        /COALESCE\(\s*ARRAY_AGG\(sot\.topping_name_snapshot ORDER BY sot\.topping_name_snapshot\),\s*ARRAY\[\]::varchar\[\]/,
      );
      expect(sql).toContain('FROM sales_order_item_toppings sot');
      expect(sql).toContain('WHERE sot.sales_order_item_id = soi.id');
      expect(sql).toMatch(/\) topping ON TRUE/);
    });

    it('should group variants without multiplying sums or consulting current master data', async () => {
      await repo.getOwnerSummary(companyId, {}, businessDate);
      const [sql, params] = callWith('FROM sales_order_items soi');

      expect(sql).toContain(
        'GROUP BY soi.product_id, soi.product_name_snapshot, topping.topping_names',
      );
      expect(sql.match(/SUM\(soi\.qty\)/g)).toHaveLength(1);
      expect(sql.match(/SUM\(soi\.line_total\)/g)).toHaveLength(1);
      expect(sql).not.toMatch(/JOIN\s+(?:products|toppings)\b/i);
      expect(sql).toContain('ORDER BY qty_sold DESC, product_name, topping.topping_names');
      expect(sql).toContain('LIMIT $4');
      expect(params).toEqual([companyId, '2026-10-19', '2026-10-25', 10]);
    });
  });
});
