import { Pool, PoolClient } from 'pg';
import pool from '../../database/pool';
import { DashboardRepositoryPostgres } from '../DashboardRepositoryPostgres';
import { ReportsRepositoryPostgres } from '../ReportsRepositoryPostgres';
import { SalesReport } from '../../../Domains/reports/entities/SalesReport';

const syntheticId = (n: number): string =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const companyId = syntheticId(1);
const otherCompanyId = syntheticId(2);
const outletId = syntheticId(3);
const otherOutletId = syntheticId(4);
const productId = syntheticId(5);
const otherProductId = syntheticId(6);
const productName = 'Synthetic Waffle Snapshot';
const berry = 'Synthetic Berry Snapshot';
const cocoa = 'Synthetic Cocoa Snapshot';
const businessDate = new Date('2026-10-25T03:00:00.000Z');
const dateFrom = '2026-10-19';
const dateTo = '2026-10-25';

type RepositoryKind = 'dashboard' | 'sales report';
interface FixtureItem {
  productId: string;
  productName: string;
  qty: number;
  lineTotal: number;
  toppings: string[];
}
interface FixtureOrder {
  items: FixtureItem[];
  companyId?: string;
  outletId?: string;
  status?: string;
  paidAt?: string | null;
  grandTotal?: number;
  itemCount?: number;
}

const waffle = (qty = 1, lineTotal = 100, toppings: string[] = []): FixtureItem => ({
  productId,
  productName,
  qty,
  lineTotal,
  toppings,
});
const variant = (toppingNames: string[], qtySold: number, revenue: number) => ({
  productId,
  productName,
  toppingNames,
  qtySold,
  revenue,
});

// SQL DATE may be local midnight; UTC conversion would shift its calendar day.
function calendarDate(value: string | Date): string {
  if (value instanceof Date) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }
  return value;
}
function dailyRows(report: SalesReport) {
  return report.details.map((row) => ({ ...row, date: calendarDate(row.date) }));
}

describe('sales topping combinations (real PostgreSQL, TEMP tables only)', () => {
  let client: PoolClient | undefined;
  let dashboard: DashboardRepositoryPostgres;
  let reports: ReportsRepositoryPostgres;
  let savepointActive = false;
  let sequence = 100;
  let salesQueue: Promise<void> = Promise.resolve();

  function db(): PoolClient {
    if (!client) throw new Error('The isolated PostgreSQL client is not connected');
    return client;
  }

  // pg_temp-only search_path prevents fixtures from accessing public master data.
  function salesQuery(sql: string, params?: unknown[]) {
    if (!/^\s*SELECT\b/i.test(sql) || /\bpublic\s*\./i.test(sql)) {
      throw new Error('Only isolated sales SELECT queries are allowed');
    }
    // Serialize Promise.all queries without relying on pg's deprecated client queue.
    const result = salesQueue.then(() => db().query(sql, params));
    salesQueue = result.then(() => undefined, () => undefined);
    return result;
  }
  const reportQuery = jest.fn(salesQuery);

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('This suite requires NODE_ENV=test and the existing test pool');
    }
    for (const key of ['PGHOST_TEST', 'PGUSER_TEST', 'PGDATABASE_TEST']) {
      if (!process.env[key]) throw new Error(`Missing required test environment: ${key}`);
    }
    if (!['localhost', '127.0.0.1', '::1'].includes(process.env.PGHOST_TEST!)) {
      throw new Error('This suite must use local PostgreSQL via PGHOST_TEST');
    }

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL search_path TO pg_temp');
    await client.query(`
      CREATE TEMP TABLE sales_orders (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL,
        outlet_id uuid NOT NULL,
        status varchar NOT NULL,
        paid_at timestamp WITHOUT TIME ZONE,
        grand_total numeric(16, 2) NOT NULL,
        item_count integer NOT NULL
      ) ON COMMIT DROP;
      CREATE TEMP TABLE sales_order_items (
        id uuid PRIMARY KEY,
        sales_order_id uuid NOT NULL,
        product_id uuid NOT NULL,
        product_name_snapshot varchar NOT NULL,
        qty numeric(12, 3) NOT NULL,
        line_total numeric(16, 2) NOT NULL
      ) ON COMMIT DROP;
      CREATE TEMP TABLE sales_order_item_toppings (
        sales_order_item_id uuid NOT NULL,
        topping_name_snapshot varchar NOT NULL
      ) ON COMMIT DROP;
      CREATE TEMP TABLE outlets (
        id uuid PRIMARY KEY,
        name varchar NOT NULL
      ) ON COMMIT DROP;
    `);
    await client.query(
      'INSERT INTO pg_temp.outlets (id, name) VALUES ($1, $2), ($3, $4)',
      [outletId, 'Synthetic Outlet One', otherOutletId, 'Synthetic Outlet Two'],
    );

    dashboard = new DashboardRepositoryPostgres({
      query: (sql: string, params?: unknown[]) => {
        // Inventory is stubbed to keep all fixture tables confined to sales.
        if (/\bFROM inventory_batches\b/i.test(sql)) {
          return Promise.resolve({
            rows: sql.includes('COUNT(*) AS count') ? [{ count: '0' }] : [],
          });
        }
        return salesQuery(sql, params);
      },
    } as unknown as Pool);
    reports = new ReportsRepositoryPostgres({ query: reportQuery } as unknown as Pool);
  }, 20000);

  beforeEach(async () => {
    if (!client) return;
    await client.query('SAVEPOINT fixture');
    savepointActive = true;
    reportQuery.mockClear();
  });

  afterEach(async () => {
    if (!client || !savepointActive) return;
    try {
      // Drain even after a rejected Promise.all before rolling back fixtures.
      await salesQueue;
      await client.query('ROLLBACK TO SAVEPOINT fixture');
      await client.query('RELEASE SAVEPOINT fixture');
    } finally {
      savepointActive = false;
    }
  });

  afterAll(async () => {
    try {
      await salesQueue;
      if (client) await client.query('ROLLBACK');
    } finally {
      client?.release();
      await pool.end();
    }
  });

  async function addOrder(order: FixtureOrder): Promise<void> {
    const orderId = syntheticId(sequence++);
    await db().query(
      `INSERT INTO pg_temp.sales_orders
       (id, company_id, outlet_id, status, paid_at, grand_total, item_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orderId,
        order.companyId ?? companyId,
        order.outletId ?? outletId,
        order.status ?? 'PAID',
        order.paidAt === undefined ? '2026-10-25 03:00:00' : order.paidAt,
        order.grandTotal ?? order.items.reduce((sum, item) => sum + item.lineTotal, 0),
        order.itemCount ?? order.items.reduce((sum, item) => sum + item.qty, 0),
      ],
    );
    for (const item of order.items) {
      const itemId = syntheticId(sequence++);
      await db().query(
        `INSERT INTO pg_temp.sales_order_items
         (id, sales_order_id, product_id, product_name_snapshot, qty, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, orderId, item.productId, item.productName, item.qty, item.lineTotal],
      );
      for (const topping of item.toppings) {
        await db().query(
          `INSERT INTO pg_temp.sales_order_item_toppings
           (sales_order_item_id, topping_name_snapshot) VALUES ($1, $2)`,
          [itemId, topping],
        );
      }
    }
  }

  async function readVariants(
    kind: RepositoryKind,
    scope: { companyId?: string; outletId?: string } = {},
  ) {
    const scopedCompany = scope.companyId ?? companyId;
    if (kind === 'dashboard') {
      return (
        await dashboard.getOwnerSummary(
          scopedCompany,
          { outletId: scope.outletId },
          businessDate,
        )
      ).topProducts;
    }
    return (await reports.getSalesReport(scopedCompany, {
      dateFrom,
      dateTo,
      outletId: scope.outletId,
    })).topProducts;
  }

  it('resolves all fixture tables exclusively to this session TEMP schema', async () => {
    const result = await db().query(`
      SELECT relname, relpersistence, relnamespace = pg_my_temp_schema() AS isolated
      FROM pg_catalog.pg_class
      WHERE oid IN (
        'sales_orders'::regclass, 'sales_order_items'::regclass,
        'sales_order_item_toppings'::regclass, 'outlets'::regclass
      ) ORDER BY relname
    `);
    expect(result.rows).toEqual([
      'outlets', 'sales_order_item_toppings', 'sales_order_items', 'sales_orders',
    ].map((relname) => ({ relname, relpersistence: 't', isolated: true })));
  });

  describe.each<RepositoryKind>(['dashboard', 'sales report'])('%s', (kind) => {
    it('returns [] toppingNames and combines plain lines without losing quantity', async () => {
      await addOrder({ items: [waffle(2, 15000), waffle(3, 21000)] });
      expect(await readVariants(kind)).toEqual([variant([], 5, 36000)]);
    });

    it('returns one sold topping snapshot as a string array', async () => {
      await addOrder({ items: [waffle(2, 21000, [cocoa])] });
      expect(await readVariants(kind)).toEqual([variant([cocoa], 2, 21000)]);
    });

    it('groups reversed topping selection order into the same sorted variant across orders', async () => {
      await addOrder({ items: [waffle(2, 17000.25, [cocoa, berry])] });
      await addOrder({ items: [waffle(3, 24000.50, [berry, cocoa])] });
      expect(await readVariants(kind)).toEqual([variant([berry, cocoa], 5, 41000.75)]);
    });

    it('keeps plain, single-topping and distinct multi-topping combinations separate', async () => {
      await addOrder({ items: [
        waffle(1, 1000, [cocoa, berry]),
        waffle(2, 2000, [berry]),
        waffle(3, 3000, [cocoa]),
        waffle(4, 4000),
      ] });
      expect(await readVariants(kind)).toEqual([
        variant([], 4, 4000),
        variant([cocoa], 3, 3000),
        variant([berry], 2, 2000),
        variant([berry, cocoa], 1, 1000),
      ]);
    });

    it('does not double quantity or line revenue for an item with two toppings', async () => {
      await addOrder({ items: [waffle(3, 18750.25, [cocoa, berry])] });
      expect(await readVariants(kind)).toEqual([variant([berry, cocoa], 3, 18750.25)]);
    });

    it('preserves fractional quantities and discounted line totals, not order grand totals', async () => {
      await addOrder({
        items: [waffle(1.25, 9000.10, [cocoa]), waffle(2.5, 15000.20, [cocoa])],
        itemCount: 4,
        grandTotal: 99999,
      });
      expect(await readVariants(kind)).toEqual([variant([cocoa], 3.75, 24000.30)]);
    });

    it('groups by product ID and historical name as well as the topping combination', async () => {
      await addOrder({ items: [
        waffle(3, 300, [cocoa]),
        { ...waffle(2, 200, [cocoa]), productName: 'Synthetic Earlier Waffle Snapshot' },
        { ...waffle(1, 100, [cocoa]), productId: otherProductId },
      ] });
      expect(await readVariants(kind)).toEqual([
        variant([cocoa], 3, 300),
        { ...variant([cocoa], 2, 200), productName: 'Synthetic Earlier Waffle Snapshot' },
        { ...variant([cocoa], 1, 100), productId: otherProductId },
      ]);
    });

    it('excludes another company even when product/outlet snapshots match', async () => {
      await addOrder({ items: [waffle(2, 200, [cocoa])] });
      await addOrder({ companyId: otherCompanyId, items: [waffle(999, 99999, [cocoa])] });
      expect(await readVariants(kind)).toEqual([variant([cocoa], 2, 200)]);
      expect(await readVariants(kind, { companyId: otherCompanyId }))
        .toEqual([variant([cocoa], 999, 99999)]);
    });

    it('includes and combines both outlets for a company-wide request', async () => {
      await addOrder({ items: [waffle(2, 200, [cocoa])] });
      await addOrder({ outletId: otherOutletId, items: [waffle(3, 300, [cocoa])] });
      expect(await readVariants(kind)).toEqual([variant([cocoa], 5, 500)]);
    });

    it('filters the requested outlet without displacing date or limit parameters', async () => {
      await addOrder({ items: [waffle(2, 200, [cocoa])] });
      await addOrder({ outletId: otherOutletId, items: [waffle(999, 99999, [cocoa])] });
      expect(await readVariants(kind, { outletId })).toEqual([variant([cocoa], 2, 200)]);
      expect(await readVariants(kind, { outletId: otherOutletId }))
        .toEqual([variant([cocoa], 999, 99999)]);
    });

    it('defaults to PAID and excludes other statuses and missing paid_at', async () => {
      await addOrder({ items: [waffle(2, 200, [cocoa])] });
      for (const status of ['REFUNDED', 'CANCELLED', 'DRAFT']) {
        await addOrder({ status, items: [waffle(999, 99999, [cocoa])] });
      }
      await addOrder({ paidAt: null, items: [waffle(999, 99999, [cocoa])] });
      expect(await readVariants(kind)).toEqual([variant([cocoa], 2, 200)]);
    });

    it('includes both Jakarta date boundaries and excludes their adjacent UTC instants', async () => {
      await addOrder({ paidAt: '2026-10-18 16:59:59', items: [waffle(999, 99999)] });
      await addOrder({ paidAt: '2026-10-18 17:00:00', items: [waffle(2, 200)] });
      await addOrder({ paidAt: '2026-10-25 16:59:59', items: [waffle(3, 300)] });
      await addOrder({ paidAt: '2026-10-25 17:00:00', items: [waffle(999, 99999)] });
      expect(await readVariants(kind)).toEqual([variant([], 5, 500)]);
    });

    it('uses sold snapshots without any accessible current product or topping master tables', async () => {
      const masters = await db().query(`
        SELECT to_regclass('products')::text AS products,
               to_regclass('toppings')::text AS toppings
      `);
      expect(masters.rows).toEqual([{ products: null, toppings: null }]);
      await addOrder({ items: [waffle(2, 200, [cocoa, berry])] });
      expect(await readVariants(kind)).toEqual([variant([berry, cocoa], 2, 200)]);
    });

    it('returns an empty top-products list when no sales match', async () => {
      expect(await readVariants(kind)).toEqual([]);
    });

    it('orders equal quantities by snapshot name and sorted toppings, limiting variants to 10', async () => {
      const items: FixtureItem[] = [
        ...[[], [berry], [cocoa]].map((toppings) => ({
          ...waffle(1, 100, toppings), productName: 'A Synthetic Waffle',
        })),
        ...Array.from({ length: 9 }, (_, i) => ({
          ...waffle(1, 100, [`Synthetic Topping ${String(i + 1).padStart(2, '0')}`]),
          productName: 'B Synthetic Waffle',
        })),
      ];
      // Insertion order is deliberately the reverse of the expected result.
      await addOrder({ items: [...items].reverse() });
      const expected = items.slice(0, 10).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        toppingNames: item.toppings,
        qtySold: 1,
        revenue: 100,
      }));
      expect(await readVariants(kind)).toEqual(expected);
      expect(await readVariants(kind)).toEqual(expected);
      const limited = kind === 'dashboard'
        ? (
            await dashboard.getOwnerSummary(
              companyId,
              { topProductsLimit: 5 },
              businessDate,
            )
          ).topProducts
        : (
            await reports.getSalesReport(companyId, {
              dateFrom,
              dateTo,
              topProductsLimit: 5,
            })
          ).topProducts;
      expect(limited).toEqual(expected.slice(0, 5));
      if (kind === 'sales report') {
        const report = await reports.getSalesReport(companyId, { dateFrom, dateTo });
        expect(report.summary).toEqual({
          totalOrders: 1, totalRevenue: 1200, averageOrderValue: 1200, totalItemsSold: 12,
        });
        expect(report.details[0].itemsSold).toBe(12);
      }
    });
  });

  describe('real sales summary and daily queries', () => {
    it('places UTC 17:xx on the next Jakarta business day consistently in all three report queries', async () => {
      await addOrder({ paidAt: '2026-10-24 16:59:59', items: [waffle(999, 99999)] });
      await addOrder({ paidAt: '2026-10-24 17:00:00', items: [waffle(2, 100, [cocoa])], grandTotal: 110 });
      await addOrder({ paidAt: '2026-10-24 17:35:00', items: [waffle(3, 200, [cocoa])], grandTotal: 220 });
      await addOrder({ paidAt: '2026-10-25 16:59:59', items: [waffle(4, 300, [cocoa])], grandTotal: 330 });
      await addOrder({ paidAt: '2026-10-25 17:00:00', items: [waffle(999, 99999)] });
      const report = await reports.getSalesReport(companyId, {
        dateFrom: dateTo, dateTo, outletId,
      });
      expect(reportQuery).toHaveBeenCalledTimes(3);
      expect(report.summary).toEqual({
        totalOrders: 3, totalRevenue: 660, averageOrderValue: 220, totalItemsSold: 9,
      });
      expect(dailyRows(report)).toEqual([{
        date: dateTo, outletId, outletName: 'Synthetic Outlet One',
        orderCount: 3, revenue: 660, itemsSold: 9,
      }]);
      expect(report.topProducts).toEqual([variant([cocoa], 9, 600)]);
      const owner = await dashboard.getOwnerSummary(
        companyId,
        { outletId },
        new Date('2026-10-24T17:35:00.000Z'),
      );
      expect(owner.salesToday).toBe(report.summary.totalOrders);
      expect(owner.revenueToday).toBe(report.summary.totalRevenue);
      expect(owner.salesTrend.map((row) => ({ ...row, date: calendarDate(row.date) })))
        .toContainEqual({ date: dateTo, revenue: 660, orderCount: 3 });
    });

    it.each(['REFUNDED', 'CANCELLED'])('honors explicit %s, company, outlet and dates in all sales queries', async (status) => {
      await addOrder({ status, paidAt: '2026-10-24 17:35:00', items: [waffle(2, 20, [cocoa, berry])], grandTotal: 25 });
      await addOrder({ status: 'PAID', items: [waffle(999, 99999)] });
      await addOrder({ status: status === 'REFUNDED' ? 'CANCELLED' : 'REFUNDED', items: [waffle(999, 99999)] });
      await addOrder({ status, companyId: otherCompanyId, items: [waffle(999, 99999)] });
      await addOrder({ status, outletId: otherOutletId, items: [waffle(999, 99999)] });
      await addOrder({ status, paidAt: '2026-10-24 16:59:59', items: [waffle(999, 99999)] });
      await addOrder({ status, paidAt: '2026-10-25 17:00:00', items: [waffle(999, 99999)] });
      const report = await reports.getSalesReport(companyId, {
        dateFrom: dateTo, dateTo, outletId, status,
      });
      expect(reportQuery).toHaveBeenCalledTimes(3);
      expect(report.summary).toEqual({
        totalOrders: 1, totalRevenue: 25, averageOrderValue: 25, totalItemsSold: 2,
      });
      expect(dailyRows(report)).toEqual([{
        date: dateTo, outletId, outletName: 'Synthetic Outlet One',
        orderCount: 1, revenue: 25, itemsSold: 2,
      }]);
      expect(report.topProducts).toEqual([variant([berry, cocoa], 2, 20)]);
    });

    it('groups and orders daily rows by Jakarta day and outlet over a multi-day range', async () => {
      await addOrder({ paidAt: '2026-10-23 17:15:00', items: [waffle(1, 100)], grandTotal: 110 });
      await addOrder({ paidAt: '2026-10-24 16:59:59', items: [waffle(2, 200)], grandTotal: 220 });
      await addOrder({ paidAt: '2026-10-24 17:45:00', outletId: otherOutletId, items: [waffle(3, 300)], grandTotal: 330 });
      const report = await reports.getSalesReport(companyId, {
        dateFrom: '2026-10-24', dateTo,
      });
      expect(reportQuery).toHaveBeenCalledTimes(3);
      expect(report.summary).toEqual({
        totalOrders: 3, totalRevenue: 660, averageOrderValue: 220, totalItemsSold: 6,
      });
      expect(dailyRows(report)).toEqual([
        { date: '2026-10-24', outletId, outletName: 'Synthetic Outlet One', orderCount: 2, revenue: 330, itemsSold: 3 },
        { date: dateTo, outletId: otherOutletId, outletName: 'Synthetic Outlet Two', orderCount: 1, revenue: 330, itemsSold: 3 },
      ]);
      expect(report.topProducts).toEqual([variant([], 6, 600)]);
    });

    it('returns zero summary aggregates and empty daily/top rows when filters exclude all sales', async () => {
      await addOrder({ companyId: otherCompanyId, items: [waffle(999, 99999)] });
      const report = await reports.getSalesReport(companyId, { dateFrom, dateTo, outletId });
      expect(reportQuery).toHaveBeenCalledTimes(3);
      expect(report.summary).toEqual({
        totalOrders: 0, totalRevenue: 0, averageOrderValue: 0, totalItemsSold: 0,
      });
      expect(report.details).toEqual([]);
      expect(report.topProducts).toEqual([]);
    });
  });
});
