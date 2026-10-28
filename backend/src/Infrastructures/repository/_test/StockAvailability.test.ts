import { Pool, PoolClient } from 'pg';
import pool from '../../database/pool';
import { InventoryRepositoryPostgres } from '../InventoryRepositoryPostgres';
import { SalesOrderRepositoryPostgres } from '../SalesOrderRepositoryPostgres';
import { StockOnHandFilter } from '../../../Domains/inventory/InventoryRepository';

const syntheticId = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const companyId = syntheticId(1);
const otherCompanyId = syntheticId(2);
const outletId = syntheticId(3);
const otherOutletId = syntheticId(4);
const productId = syntheticId(5);
const otherProductId = syntheticId(6);
const uomId = syntheticId(7);
const businessDate = new Date('2026-10-25T03:00:00.000Z');
const yesterday = '2026-10-24';
const today = '2026-10-25';
const tomorrow = '2026-10-26';
const beforeMidnight = new Date('2026-10-24T16:59:59.999Z');
const atMidnight = new Date('2026-10-24T17:00:00.000Z');
const page = { limit: 20, offset: 0 };
const lowStock = { ...page, lowOnly: true };
const checkoutItem = (qty: number, id = productId) => ({
  productId: id,
  qty,
  itemDiscount: 0,
  toppings: [],
});

type Catalog = 'POS products' | 'active toppings';
interface ProductFixture {
  id?: string;
  companyId?: string;
  name?: string;
  sku?: string;
  minimumStock?: number;
}
interface BatchFixture {
  productId?: string;
  companyId?: string;
  outletId?: string;
  qty: number;
  expiry?: string | null;
  status?: string;
}

describe('current stock availability (real PostgreSQL, TEMP tables only)', () => {
  let client: PoolClient | undefined;
  let inventory: InventoryRepositoryPostgres;
  let sales: SalesOrderRepositoryPostgres;
  let fixtureActive = false;
  let sequence = 100;
  let queryQueue: Promise<void> = Promise.resolve();

  function db(): PoolClient {
    if (!client) throw new Error('The isolated PostgreSQL client is not connected');
    return client;
  }

  function readQuery(sql: string, params?: unknown[]) {
    if (!/^\s*SELECT\b/i.test(sql) || /\bpublic\s*\./i.test(sql)) {
      throw new Error('Only isolated SELECT queries are allowed');
    }
    const result = queryQueue.then(() => db().query(sql, params));
    queryQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  // Savepoints keep repository commits inside the rollback-only test transaction.
  async function payQuery(sql: string, params?: unknown[]) {
    switch (sql.trim()) {
      case 'BEGIN':
        return db().query('SAVEPOINT repository_pay');
      case 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE': {
        const result = await db().query('SHOW transaction_isolation');
        expect(result.rows[0].transaction_isolation).toBe('serializable');
        return result;
      }
      case 'COMMIT':
        return db().query('RELEASE SAVEPOINT repository_pay');
      case 'ROLLBACK':
        await db().query('ROLLBACK TO SAVEPOINT repository_pay');
        return db().query('RELEASE SAVEPOINT repository_pay');
      default:
        if (/\bpublic\s*\./i.test(sql) || !/^\s*(SELECT|UPDATE|INSERT INTO)\b/i.test(sql)) {
          throw new Error('Only isolated pay queries are allowed');
        }
        return db().query(sql, params);
    }
  }

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
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await client.query('SET LOCAL search_path TO pg_temp');
    await client.query(`
      CREATE TEMP TABLE uoms (
        id uuid PRIMARY KEY, code varchar NOT NULL, name varchar NOT NULL
      ) ON COMMIT DROP;
      CREATE TEMP TABLE outlets (
        id uuid PRIMARY KEY, company_id uuid NOT NULL, name varchar NOT NULL
      ) ON COMMIT DROP;
      CREATE TEMP TABLE products (
        id uuid PRIMARY KEY, company_id uuid NOT NULL, uom_id uuid NOT NULL,
        name varchar NOT NULL, sku varchar NOT NULL, minimum_stock numeric NOT NULL,
        selling_price numeric NOT NULL DEFAULT 100,
        product_type varchar NOT NULL DEFAULT 'FINISHED_GOODS',
        is_active boolean NOT NULL DEFAULT TRUE,
        has_toppings boolean NOT NULL DEFAULT TRUE, deleted_at timestamp
      ) ON COMMIT DROP;
      CREATE TEMP TABLE inventory_batches (
        id uuid PRIMARY KEY, company_id uuid NOT NULL, outlet_id uuid NOT NULL,
        product_id uuid NOT NULL, qty_available numeric(12, 3) NOT NULL,
        expired_date date, status varchar NOT NULL,
        received_date date NOT NULL DEFAULT '2026-10-01',
        created_at timestamp NOT NULL DEFAULT NOW(), updated_at timestamp
      ) ON COMMIT DROP;
      CREATE TEMP TABLE recipes (
        id uuid PRIMARY KEY, company_id uuid NOT NULL, product_id uuid NOT NULL,
        status varchar NOT NULL, deleted_at timestamp
      ) ON COMMIT DROP;
      CREATE TEMP TABLE toppings (
        company_id uuid NOT NULL, topping_product_id uuid NOT NULL,
        default_qty_per_item numeric NOT NULL DEFAULT 1,
        extra_price numeric NOT NULL DEFAULT 10, sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT TRUE, deleted_at timestamp
      ) ON COMMIT DROP;
      CREATE TEMP TABLE sales_orders (
        id uuid PRIMARY KEY, company_id uuid NOT NULL, outlet_id uuid NOT NULL,
        shift_id uuid NOT NULL, invoice_number varchar NOT NULL, customer_name varchar,
        order_date timestamp NOT NULL DEFAULT NOW(),
        status varchar NOT NULL DEFAULT 'PENDING_PAYMENT', item_count integer NOT NULL,
        subtotal numeric NOT NULL, order_discount numeric NOT NULL DEFAULT 0,
        tax numeric NOT NULL DEFAULT 0, grand_total numeric NOT NULL,
        cashier_user_id uuid, paid_at timestamp, deleted_at timestamp,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(), updated_by uuid
      ) ON COMMIT DROP;
      CREATE TEMP TABLE sales_order_items (
        id uuid PRIMARY KEY, sales_order_id uuid NOT NULL, product_id uuid NOT NULL,
        sale_mode varchar NOT NULL DEFAULT 'STOCK', recipe_id uuid,
        product_name_snapshot varchar NOT NULL, unit_price_snapshot numeric NOT NULL,
        qty numeric NOT NULL, item_discount numeric NOT NULL DEFAULT 0,
        toppings_price numeric NOT NULL DEFAULT 0, line_total numeric NOT NULL,
        created_at timestamp NOT NULL DEFAULT NOW()
      ) ON COMMIT DROP;
      CREATE TEMP TABLE sales_order_item_toppings (
        id uuid PRIMARY KEY, sales_order_item_id uuid NOT NULL,
        topping_product_id uuid NOT NULL, topping_name_snapshot varchar NOT NULL,
        qty_per_item numeric NOT NULL, extra_price_snapshot numeric NOT NULL,
        created_at timestamp NOT NULL DEFAULT NOW()
      ) ON COMMIT DROP;
      CREATE TEMP TABLE inventory_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL, outlet_id uuid NOT NULL, batch_id uuid NOT NULL,
        product_id uuid NOT NULL, movement_type varchar NOT NULL, qty numeric NOT NULL,
        before_qty numeric NOT NULL, after_qty numeric NOT NULL,
        source_document_type varchar NOT NULL, source_document_id uuid NOT NULL,
        source_document_item_id uuid NOT NULL, source_document_allocation_id uuid NOT NULL,
        user_id uuid
      ) ON COMMIT DROP;
      CREATE TEMP TABLE sales_consumptions (
        company_id uuid NOT NULL, outlet_id uuid NOT NULL, sales_order_id uuid NOT NULL,
        sales_order_item_id uuid NOT NULL, product_id uuid NOT NULL, batch_id uuid NOT NULL,
        qty_consumed numeric NOT NULL, movement_id uuid NOT NULL
      ) ON COMMIT DROP;
      CREATE TEMP TABLE sales_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL, outlet_id uuid NOT NULL, sales_order_id uuid NOT NULL,
        payment_method varchar NOT NULL, amount numeric NOT NULL, reference_no varchar,
        created_by uuid, paid_at timestamp NOT NULL DEFAULT NOW(),
        created_at timestamp NOT NULL DEFAULT NOW()
      ) ON COMMIT DROP;
    `);
    await client.query('INSERT INTO pg_temp.uoms VALUES ($1, $2, $3)', [uomId, 'PCS', 'Pieces']);
    await client.query('INSERT INTO pg_temp.outlets VALUES ($1, $2, $3), ($4, $2, $5)', [
      outletId,
      companyId,
      'Synthetic Outlet One',
      otherOutletId,
      'Synthetic Outlet Two',
    ]);
    const isolatedPool = {
      query: readQuery,
      connect: async () => ({ query: payQuery, release: () => undefined }),
    } as unknown as Pool;
    inventory = new InventoryRepositoryPostgres(isolatedPool);
    sales = new SalesOrderRepositoryPostgres(isolatedPool);
  }, 20000);

  beforeEach(async () => {
    if (!client) return;
    await client.query('SAVEPOINT fixture');
    fixtureActive = true;
  });

  afterEach(async () => {
    if (!client || !fixtureActive) return;
    try {
      await queryQueue;
      await client.query('ROLLBACK TO SAVEPOINT fixture');
      await client.query('RELEASE SAVEPOINT fixture');
    } finally {
      fixtureActive = false;
    }
  });

  afterAll(async () => {
    try {
      await queryQueue;
      if (client) await client.query('ROLLBACK');
    } finally {
      client?.release();
      await pool.end();
    }
  });

  async function addProduct(fixture: ProductFixture = {}) {
    const id = fixture.id ?? productId;
    await db().query(
      `
      INSERT INTO pg_temp.products (id, company_id, uom_id, name, sku, minimum_stock)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        id,
        fixture.companyId ?? companyId,
        uomId,
        fixture.name ?? 'Synthetic Bread',
        fixture.sku ?? 'SYN-BREAD',
        fixture.minimumStock ?? 10,
      ],
    );
    return id;
  }

  async function addBatch(fixture: BatchFixture) {
    const id = syntheticId(sequence++);
    await db().query(
      `
      INSERT INTO pg_temp.inventory_batches
        (id, company_id, outlet_id, product_id, qty_available, expired_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        id,
        fixture.companyId ?? companyId,
        fixture.outletId ?? outletId,
        fixture.productId ?? productId,
        fixture.qty,
        fixture.expiry ?? null,
        fixture.status ?? 'ACTIVE',
      ],
    );
    return id;
  }

  async function addMixedBatches() {
    await addBatch({ qty: 101, expiry: yesterday });
    await addBatch({ qty: 2.25, expiry: today });
    await addBatch({ qty: 3.5, expiry: tomorrow });
    await addBatch({ qty: 4, expiry: null });
    for (const status of ['EXPIRED', 'QUARANTINE', 'CONSUMED']) {
      await addBatch({ qty: 999, expiry: today, status });
      await addBatch({ qty: 999, expiry: yesterday, status });
    }
    await addBatch({ qty: 0, expiry: yesterday });
    await addBatch({ qty: 0, expiry: tomorrow });
  }

  async function addTopping(id = productId, company = companyId) {
    await db().query(
      `
      INSERT INTO pg_temp.toppings (company_id, topping_product_id) VALUES ($1, $2)
    `,
      [company, id],
    );
  }

  async function readCatalog(
    kind: Catalog,
    company = companyId,
    outlet: string | undefined = outletId,
    date = businessDate,
  ) {
    if (kind === 'POS products') {
      const result = await sales.listPosProducts(company, { ...page, outletId: outlet }, date);
      return result.rows.map((row) => ({
        productId: row.productId,
        availableQty: row.availableQty,
        expiredQty: row.expiredQty,
      }));
    }
    return (await sales.listActiveToppings(company, outlet, date)).map((row) => ({
      productId: row.toppingProductId,
      availableQty: row.availableQty,
      expiredQty: row.expiredQty,
    }));
  }

  it('resolves every fixture table only to this session TEMP schema', async () => {
    const tables = [
      'uoms',
      'outlets',
      'products',
      'inventory_batches',
      'recipes',
      'toppings',
      'sales_orders',
      'sales_order_items',
      'sales_order_item_toppings',
      'inventory_movements',
      'sales_consumptions',
      'sales_payments',
    ].sort();
    const result = await db().query(
      `
      SELECT relname, relpersistence, relnamespace = pg_my_temp_schema() AS isolated
      FROM pg_catalog.pg_class WHERE oid = ANY($1::regclass[]) ORDER BY relname
    `,
      [tables],
    );
    expect(result.rows).toEqual(
      tables.map((relname) => ({
        relname,
        relpersistence: 't',
        isolated: true,
      })),
    );
    expect((await db().query('SHOW search_path')).rows).toEqual([{ search_path: 'pg_temp' }]);
  });

  describe('getStockOnHand', () => {
    it('sums same-day, future and undated ACTIVE stock, excluding yesterday and other statuses', async () => {
      await addProduct();
      await addMixedBatches();
      const result = await inventory.getStockOnHand(companyId, lowStock, businessDate);
      expect(result.total).toBe(1);
      expect(result.rows).toEqual([
        expect.objectContaining({
          productId,
          outletId,
          qtyAvailable: 9.75,
          minimumStock: 10,
          isLow: true,
          uomId,
          uomCode: 'PCS',
          uomName: 'Pieces',
        }),
      ]);
    });

    it('retains an all-expired group at zero in lowOnly rows and total; excludes threshold/zero minimum', async () => {
      await addProduct();
      await addBatch({ qty: 100, expiry: yesterday });
      await addProduct({ id: otherProductId });
      await addBatch({ productId: otherProductId, qty: 10, expiry: today });
      const noMinimum = await addProduct({ id: syntheticId(8), minimumStock: 0 });
      await addBatch({ productId: noMinimum, qty: 100, expiry: yesterday });
      const inactiveOnly = await addProduct({ id: syntheticId(9) });
      await addBatch({ productId: inactiveOnly, qty: 100, status: 'QUARANTINE' });
      expect(await inventory.getStockOnHand(companyId, lowStock, businessDate)).toEqual({
        total: 1,
        rows: [expect.objectContaining({ productId, qtyAvailable: 0, isLow: true })],
      });
    });

    it.each([false, undefined])(
      'executes the unfiltered count and rows with lowOnly=%s',
      async (lowOnly) => {
        await addProduct();
        await addBatch({ qty: 100, expiry: yesterday });
        await addProduct({ id: otherProductId, name: 'Synthetic Cake' });
        await addBatch({ productId: otherProductId, qty: 12, expiry: today });
        expect(
          await inventory.getStockOnHand(companyId, { ...page, lowOnly }, businessDate),
        ).toEqual({
          total: 2,
          rows: [
            expect.objectContaining({ productId, qtyAvailable: 0, isLow: true }),
            expect.objectContaining({ productId: otherProductId, qtyAvailable: 12, isLow: false }),
          ],
        });
      },
    );

    it.each([true, false])(
      'binds outlet/product/search/date correctly with lowOnly=%s',
      async (lowOnly) => {
        await addProduct();
        await addProduct({ id: otherProductId });
        await addBatch({ qty: 2, expiry: today });
        await addBatch({ qty: 99, expiry: yesterday });
        await addBatch({ companyId: otherCompanyId, qty: 999, expiry: today });
        await addBatch({ outletId: otherOutletId, qty: 999, expiry: today });
        await addBatch({ productId: otherProductId, qty: 999, expiry: today });
        const filter: StockOnHandFilter = {
          ...page,
          lowOnly,
          outletId,
          productId,
          search: 'syn-bread',
        };
        expect(await inventory.getStockOnHand(companyId, filter, businessDate)).toEqual({
          total: 1,
          rows: [expect.objectContaining({ productId, outletId, qtyAvailable: 2, isLow: true })],
        });
      },
    );

    it.each(['needle', 'code-match'])(
      'binds case-insensitive name/SKU search "%s" and pagination after date',
      async (search) => {
        for (const [index, name] of ['A Needle', 'B Needle', 'C Needle'].entries()) {
          const id = await addProduct({
            id: syntheticId(20 + index),
            name,
            sku: `CODE-MATCH-${index}`,
          });
          await addBatch({ productId: id, qty: index + 1, expiry: today });
        }
        await addProduct();
        await addBatch({ qty: 1, expiry: today });
        const filter = { lowOnly: true, outletId, search, limit: 1, offset: 1 };
        expect(await inventory.getStockOnHand(companyId, filter, businessDate)).toEqual({
          total: 3,
          rows: [expect.objectContaining({ productId: syntheticId(21), qtyAvailable: 2 })],
        });
        expect(
          await inventory.getStockOnHand(companyId, { ...filter, offset: 3 }, businessDate),
        ).toEqual({ total: 3, rows: [] });
      },
    );

    it('keeps product/outlet groups separate in company-wide rows and counts', async () => {
      await addProduct();
      await addBatch({ qty: 2, expiry: today });
      await addBatch({ qty: 3, outletId: otherOutletId, expiry: today });
      await addBatch({ qty: 4, companyId: otherCompanyId, expiry: today });
      const result = await inventory.getStockOnHand(companyId, lowStock, businessDate);
      expect(result.total).toBe(2);
      expect(result.rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ productId, outletId, qtyAvailable: 2 }),
          expect.objectContaining({ productId, outletId: otherOutletId, qtyAvailable: 3 }),
        ]),
      );
      expect((await inventory.getStockOnHand(otherCompanyId, lowStock, businessDate)).rows).toEqual(
        [expect.objectContaining({ productId, outletId, qtyAvailable: 4 })],
      );
    });

    it.each([
      [beforeMidnight, 2],
      [atMidnight, 0],
    ] as const)(
      'uses the Jakarta calendar date at %s (available=%s)',
      async (date, qtyAvailable) => {
        await addProduct();
        await addBatch({ qty: 2, expiry: yesterday });
        expect(await inventory.getStockOnHand(companyId, lowStock, date)).toEqual({
          total: 1,
          rows: [expect.objectContaining({ productId, qtyAvailable, isLow: true })],
        });
      },
    );
  });

  describe.each<Catalog>(['POS products', 'active toppings'])('%s', (kind) => {
    beforeEach(async () => {
      await addProduct();
      await addTopping();
    });

    it('executes both stock sums with same-day/future/undated ACTIVE stock and yesterday expired', async () => {
      await addMixedBatches();
      expect(await readCatalog(kind)).toEqual([{ productId, availableQty: 9.75, expiredQty: 101 }]);
    });

    it('retains an all-expired product with zero available quantity', async () => {
      await addBatch({ qty: 5, expiry: yesterday });
      expect(await readCatalog(kind)).toEqual([{ productId, availableQty: 0, expiredQty: 5 }]);
    });

    it('isolates both sums by company, outlet and product', async () => {
      await addProduct({ id: otherProductId, name: 'Synthetic Cake' });
      await addTopping(otherProductId);
      await addTopping(productId, otherCompanyId);
      await addBatch({ qty: 2, expiry: today });
      await addBatch({ qty: 3, expiry: yesterday });
      await addBatch({ qty: 11, outletId: otherOutletId, expiry: today });
      await addBatch({ qty: 13, outletId: otherOutletId, expiry: yesterday });
      await addBatch({ qty: 17, companyId: otherCompanyId, expiry: today });
      await addBatch({ qty: 19, companyId: otherCompanyId, expiry: yesterday });
      await addBatch({ qty: 5, productId: otherProductId, expiry: today });
      await addBatch({ qty: 7, productId: otherProductId, expiry: yesterday });
      const foreignProduct = await addProduct({ id: syntheticId(8), companyId: otherCompanyId });
      await addTopping(foreignProduct, otherCompanyId);
      await addBatch({ productId: foreignProduct, companyId: otherCompanyId, qty: 999 });
      expect(await readCatalog(kind)).toEqual([
        { productId, availableQty: 2, expiredQty: 3 },
        { productId: otherProductId, availableQty: 5, expiredQty: 7 },
      ]);
      expect(await readCatalog(kind, companyId, otherOutletId)).toEqual([
        { productId, availableQty: 11, expiredQty: 13 },
        { productId: otherProductId, availableQty: 0, expiredQty: 0 },
      ]);
    });

    it('returns zero stock without an outlet instead of aggregating all outlets', async () => {
      await addMixedBatches();
      if (kind === 'POS products') {
        const result = await sales.listPosProducts(companyId, page, businessDate);
        expect(result.total).toBe(1);
        expect(result.rows).toEqual([
          expect.objectContaining({ productId, availableQty: 0, expiredQty: 0 }),
        ]);
      } else {
        for (const outlet of [undefined, null]) {
          expect(await sales.listActiveToppings(companyId, outlet, businessDate)).toEqual([
            expect.objectContaining({
              toppingProductId: productId,
              availableQty: 0,
              expiredQty: 0,
            }),
          ]);
        }
      }
    });

    it.each([
      [beforeMidnight, 2, 0],
      [atMidnight, 0, 2],
    ] as const)(
      'switches yesterday stock at UTC 17:00 (%s)',
      async (date, availableQty, expiredQty) => {
        await addBatch({ qty: 2, expiry: yesterday });
        expect(await readCatalog(kind, companyId, outletId, date)).toEqual([
          { productId, availableQty, expiredQty },
        ]);
      },
    );
  });

  it.each([undefined, 'needle', 'code-match'])(
    'binds POS search=%s, limit, offset, outlet and date in real queries',
    async (search) => {
      for (const [index, name] of ['A Needle', 'B Needle', 'C Needle'].entries()) {
        const id = await addProduct({
          id: syntheticId(20 + index),
          name,
          sku: `CODE-MATCH-${index}`,
        });
        await addBatch({ productId: id, qty: index + 1, expiry: today });
        await addBatch({ productId: id, qty: 99, expiry: yesterday });
      }
      if (search) {
        await addProduct({ name: 'A Nonmatching Product' });
        await addBatch({ qty: 999 });
      }
      const filter = { limit: 1, offset: 1, search, outletId };
      const result = await sales.listPosProducts(companyId, filter, businessDate);
      expect(result.total).toBe(3);
      expect(result.rows).toEqual([
        expect.objectContaining({
          productId: syntheticId(21),
          availableQty: 2,
          expiredQty: 99,
        }),
      ]);
      expect(
        await sales.listPosProducts(companyId, { ...filter, offset: 3 }, businessDate),
      ).toEqual({ total: 3, rows: [] });
    },
  );

  describe('resolveCheckoutItems', () => {
    beforeEach(async () => {
      await addProduct();
    });

    it('accepts exactly the real sellable balance, including same-day/future/undated batches', async () => {
      await addMixedBatches();
      expect(
        await sales.resolveCheckoutItems(companyId, outletId, [checkoutItem(9.75)], businessDate),
      ).toEqual({
        items: [
          expect.objectContaining({ productId, saleMode: 'STOCK', recipeId: null, qty: 9.75 }),
        ],
      });
      await expect(
        sales.resolveCheckoutItems(companyId, outletId, [checkoutItem(10)], businessDate),
      ).rejects.toThrow('SALES_ORDER.STOCK_EXPIRED');
    });

    it('rejects all-expired ACTIVE stock instead of resolving a sellable item', async () => {
      await addBatch({ qty: 100, expiry: yesterday });
      await expect(
        sales.resolveCheckoutItems(companyId, outletId, [checkoutItem(1)], businessDate),
      ).rejects.toThrow('SALES_ORDER.STOCK_EXPIRED');
    });

    it('changes from STOCK to STOCK_EXPIRED exactly at UTC 17:00', async () => {
      await addBatch({ qty: 2, expiry: yesterday });
      expect(
        (await sales.resolveCheckoutItems(companyId, outletId, [checkoutItem(2)], beforeMidnight))
          .items,
      ).toEqual([expect.objectContaining({ productId, saleMode: 'STOCK', qty: 2 })]);
      await expect(
        sales.resolveCheckoutItems(companyId, outletId, [checkoutItem(1)], atMidnight),
      ).rejects.toThrow('SALES_ORDER.STOCK_EXPIRED');
    });

    it('ignores non-ACTIVE and drained expired batches when explaining insufficient stock', async () => {
      for (const status of ['EXPIRED', 'QUARANTINE', 'CONSUMED']) {
        await addBatch({ qty: 999, expiry: today, status });
        await addBatch({ qty: 999, expiry: yesterday, status });
      }
      await addBatch({ qty: 0, expiry: yesterday });
      await expect(
        sales.resolveCheckoutItems(companyId, outletId, [checkoutItem(1)], businessDate),
      ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
    });

    it.each(['company', 'outlet', 'product'])(
      'cannot borrow stock or an expiry reason from another %s',
      async (scope) => {
        await addProduct({ id: otherProductId });
        const foreignScope =
          scope === 'company'
            ? { companyId: otherCompanyId }
            : scope === 'outlet'
              ? { outletId: otherOutletId }
              : { productId: otherProductId };
        await addBatch({ ...foreignScope, qty: 999, expiry: today });
        await addBatch({ ...foreignScope, qty: 999, expiry: yesterday });
        await expect(
          sales.resolveCheckoutItems(companyId, outletId, [checkoutItem(1)], businessDate),
        ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
      },
    );

    it('does not resolve another company product even if that company has sellable stock', async () => {
      await addProduct({ id: otherProductId, companyId: otherCompanyId });
      await addBatch({
        productId: otherProductId,
        companyId: otherCompanyId,
        qty: 999,
        expiry: today,
      });
      await expect(
        sales.resolveCheckoutItems(
          companyId,
          outletId,
          [checkoutItem(1, otherProductId)],
          businessDate,
        ),
      ).rejects.toThrow('PRODUCT.NOT_FOUND');
    });
  });

  describe('pay through real _consumeFefo queries', () => {
    async function addPendingOrder(qty: number) {
      const orderId = syntheticId(sequence++);
      const itemId = syntheticId(sequence++);
      await db().query(
        `
        INSERT INTO pg_temp.sales_orders
          (id, company_id, outlet_id, shift_id, invoice_number, item_count, subtotal, grand_total)
        VALUES ($1, $2, $3, $4, $5, 1, $6, $6)
      `,
        [orderId, companyId, outletId, syntheticId(50), `SYN-${sequence}`, qty * 100],
      );
      await db().query(
        `
        INSERT INTO pg_temp.sales_order_items
          (id, sales_order_id, product_id, product_name_snapshot, unit_price_snapshot, qty, line_total)
        VALUES ($1, $2, $3, 'Synthetic Bread', 100, $4, $5)
      `,
        [itemId, orderId, productId, qty, qty * 100],
      );
      return {
        orderId,
        itemId,
        payments: [{ method: 'CASH', amount: qty * 100, referenceNo: null }],
      };
    }

    async function balances() {
      return (
        await db().query(`
        SELECT id, qty_available, status FROM pg_temp.inventory_batches ORDER BY id
      `)
      ).rows;
    }

    async function expectNoPaymentEffects(orderId: string) {
      expect(
        (
          await db().query('SELECT status, paid_at FROM pg_temp.sales_orders WHERE id = $1', [
            orderId,
          ])
        ).rows,
      ).toEqual([{ status: 'PENDING_PAYMENT', paid_at: null }]);
      for (const table of ['inventory_movements', 'sales_consumptions', 'sales_payments']) {
        expect((await db().query(`SELECT COUNT(*) AS count FROM pg_temp.${table}`)).rows).toEqual([
          { count: '0' },
        ]);
      }
    }

    beforeEach(async () => {
      await addProduct();
    });

    it('consumes same-day then future then undated stock and leaves expired/non-ACTIVE/foreign stock untouched', async () => {
      // Insert in reverse FEFO order, so the SQL ORDER BY must do the work.
      const undated = await addBatch({ qty: 4 });
      const future = await addBatch({ qty: 3, expiry: tomorrow });
      const sameDay = await addBatch({ qty: 2, expiry: today });
      const untouched = [
        await addBatch({ qty: 999, expiry: yesterday }),
        await addBatch({ qty: 999, expiry: today, status: 'QUARANTINE' }),
        await addBatch({ qty: 999, expiry: today, companyId: otherCompanyId }),
        await addBatch({ qty: 999, expiry: today, outletId: otherOutletId }),
        await addBatch({ qty: 999, expiry: today, productId: otherProductId }),
      ];
      const original = await balances();
      const { orderId, itemId, payments } = await addPendingOrder(6);
      const result = await sales.pay(orderId, companyId, null, payments, atMidnight);
      expect(result.status).toBe('PAID');
      expect(result.payments).toEqual([
        expect.objectContaining({ paymentMethod: 'CASH', amount: 600 }),
      ]);
      const after = await balances();
      expect(after.filter((row) => untouched.includes(row.id))).toEqual(
        original.filter((row) => untouched.includes(row.id)),
      );
      expect(after.filter((row) => !untouched.includes(row.id))).toEqual([
        { id: undated, qty_available: '3.000', status: 'ACTIVE' },
        { id: future, qty_available: '0.000', status: 'CONSUMED' },
        { id: sameDay, qty_available: '0.000', status: 'CONSUMED' },
      ]);
      const movements = await db().query(`
        SELECT batch_id, qty, before_qty, after_qty, movement_type, source_document_type,
               source_document_id, source_document_item_id, source_document_allocation_id
        FROM pg_temp.inventory_movements ORDER BY batch_id
      `);
      expect(movements.rows).toEqual(
        [
          [undated, '1', '4', '3'],
          [future, '3', '3', '0'],
          [sameDay, '2', '2', '0'],
        ].map(([batch, qty, before, afterQty]) => ({
          batch_id: batch,
          qty,
          before_qty: before,
          after_qty: afterQty,
          movement_type: 'SALE',
          source_document_type: 'SALES_ORDER',
          source_document_id: orderId,
          source_document_item_id: itemId,
          source_document_allocation_id: batch,
        })),
      );
      expect(
        (
          await db().query(`
        SELECT sc.batch_id, sc.qty_consumed, sc.sales_order_item_id,
               sc.movement_id = m.id AS linked
        FROM pg_temp.sales_consumptions sc
        JOIN pg_temp.inventory_movements m ON m.id = sc.movement_id
        ORDER BY sc.batch_id
      `)
        ).rows,
      ).toEqual(
        [
          [undated, '1'],
          [future, '3'],
          [sameDay, '2'],
        ].map(([batch, qty]) => ({
          batch_id: batch,
          qty_consumed: qty,
          sales_order_item_id: itemId,
          linked: true,
        })),
      );
    });

    it('rejects a pending order whose stock expired at UTC 17:00 without deducting it', async () => {
      await addBatch({ qty: 2, expiry: yesterday });
      // It was checkout-eligible immediately before Jakarta midnight.
      await sales.resolveCheckoutItems(companyId, outletId, [checkoutItem(1)], beforeMidnight);
      const { orderId, payments } = await addPendingOrder(1);
      const original = await balances();
      await expect(sales.pay(orderId, companyId, null, payments, atMidnight)).rejects.toThrow(
        'INVENTORY.INSUFFICIENT_STOCK',
      );
      expect(await balances()).toEqual(original);
      await expectNoPaymentEffects(orderId);
    });

    it('rolls back an earlier FEFO deduction and ledger snapshot when sellable stock is short', async () => {
      await addBatch({ qty: 2, expiry: today });
      await addBatch({ qty: 999, expiry: yesterday });
      const { orderId, payments } = await addPendingOrder(3);
      const original = await balances();
      await expect(sales.pay(orderId, companyId, null, payments, atMidnight)).rejects.toThrow(
        'INVENTORY.INSUFFICIENT_STOCK',
      );
      expect(await balances()).toEqual(original);
      await expectNoPaymentEffects(orderId);
    });
  });
});
