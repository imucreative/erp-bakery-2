import { Pool, PoolClient } from 'pg';
import pool from '../../database/pool';
import { InventoryRepositoryPostgres } from '../InventoryRepositoryPostgres';
import { BatchListFilter } from '../../../Domains/inventory/InventoryRepository';
import {
  BatchStatus,
  classifyExpiry,
  deriveOperationalStatus,
} from '../../../Domains/inventory/batchStatus';

const syntheticId = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const companyId = syntheticId(1);
const otherCompanyId = syntheticId(2);
const outletId = syntheticId(3);
const otherOutletId = syntheticId(4);
const productId = syntheticId(5);
const otherProductId = syntheticId(6);
const page = { limit: 50, offset: 0 };

// WIB calendar days: 2026-10-24 until 16:59:59.999Z, then 2026-10-25.
const beforeRollover = new Date('2026-10-24T16:59:59.999Z');
const afterRollover = new Date('2026-10-24T17:00:00.000Z');
const longPast = '2026-10-23';
const rolloverDay = '2026-10-24';
const upcomingDay = '2026-10-25';
const farFuture = '2026-12-31';

interface BatchFixture {
  companyId?: string;
  outletId?: string;
  productId?: string;
  batchNumber: string;
  expiry?: string | null;
  status?: BatchStatus;
  qty?: number;
  isNonBatch?: boolean;
}

interface Snapshot {
  id: string;
  qty_available: string;
  status: string;
  expired_date: string;
  is_non_batch: boolean;
}

describe('batch operational status (real PostgreSQL, TEMP table only)', () => {
  let client: PoolClient | undefined;
  let repository: InventoryRepositoryPostgres;
  let fixtureActive = false;
  let created = 0;
  let queryQueue: Promise<void> = Promise.resolve();
  const ids = new Map<string, string>();

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
      CREATE TEMP TABLE inventory_batches (
        id uuid PRIMARY KEY, company_id uuid NOT NULL, outlet_id uuid NOT NULL,
        product_id uuid NOT NULL, batch_number varchar(60) NOT NULL,
        lot_key varchar(60) NOT NULL DEFAULT '', lot_number varchar(60),
        expired_date date, received_date date NOT NULL DEFAULT '2026-10-01',
        qty_available numeric(18, 3) NOT NULL DEFAULT 0,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        is_non_batch boolean NOT NULL DEFAULT FALSE,
        created_at timestamp NOT NULL, updated_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT inventory_batches_status_check
          CHECK (status IN ('ACTIVE', 'EXPIRED', 'CONSUMED', 'QUARANTINE')),
        CONSTRAINT inventory_batches_qty_non_negative CHECK (qty_available >= 0)
      ) ON COMMIT DROP
    `);
    await client.query(`
      CREATE TEMP TABLE products (
        id uuid PRIMARY KEY, minimum_stock numeric NOT NULL DEFAULT 0
      ) ON COMMIT DROP;
      CREATE TEMP TABLE stock_transfers (
        id uuid PRIMARY KEY, company_id uuid NOT NULL, source_outlet_id uuid NOT NULL,
        destination_outlet_id uuid NOT NULL, status varchar NOT NULL
      ) ON COMMIT DROP
    `);
    repository = new InventoryRepositoryPostgres({ query: readQuery } as unknown as Pool);
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

  // created_at is unique per row so the repository ORDER BY is deterministic.
  async function addBatch(fixture: BatchFixture): Promise<string> {
    created += 1;
    const id = syntheticId(200 + created);
    ids.set(fixture.batchNumber, id);
    await db().query(
      `INSERT INTO pg_temp.inventory_batches
        (id, company_id, outlet_id, product_id, batch_number, expired_date,
         qty_available, status, is_non_batch, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               '2026-10-01 00:00:00'::timestamp + $10 * interval '1 minute')`,
      [
        id,
        fixture.companyId ?? companyId,
        fixture.outletId ?? outletId,
        fixture.productId ?? productId,
        fixture.batchNumber,
        fixture.expiry === undefined ? upcomingDay : fixture.expiry,
        fixture.qty ?? 10,
        fixture.status ?? 'ACTIVE',
        fixture.isNonBatch ?? false,
        created,
      ],
    );
    return id;
  }

  /** B-N/B-N2: ACTIVE past expiry, B-R: ACTIVE on the rollover day, B-U: ACTIVE upcoming. */
  async function addStandardBatches() {
    await addBatch({ batchNumber: 'B-N', expiry: longPast });
    await addBatch({ batchNumber: 'B-N2', expiry: longPast, qty: 3.5 });
    await addBatch({ batchNumber: 'B-R', expiry: rolloverDay });
    await addBatch({ batchNumber: 'B-U', expiry: upcomingDay });
    await addBatch({ batchNumber: 'B-NULL', expiry: null });
    await addBatch({ batchNumber: 'B-FAR', expiry: farFuture });
    await addBatch({ batchNumber: 'X-OLD', expiry: longPast, status: 'EXPIRED' });
    await addBatch({ batchNumber: 'X-FAR', expiry: farFuture, status: 'EXPIRED' });
    await addBatch({ batchNumber: 'Q-OLD', expiry: longPast, status: 'QUARANTINE' });
    await addBatch({ batchNumber: 'C-OLD', expiry: longPast, status: 'CONSUMED' });
    await addBatch({ batchNumber: 'NB-OLD', expiry: longPast, isNonBatch: true });
    await addBatch({ batchNumber: 'OTHER-CO', expiry: longPast, companyId: otherCompanyId });
  }

  async function list(filter: Partial<BatchListFilter> = {}, businessDate = afterRollover) {
    return repository.getBatches(companyId, { ...page, ...filter }, businessDate);
  }

  function derive(batch: Awaited<ReturnType<typeof list>>['rows'][number], businessDate: Date) {
    return deriveOperationalStatus(
      batch.status,
      classifyExpiry(batch.expiredDate, businessDate, batch.isNonBatch),
    );
  }

  async function bucketIds(
    operationalStatus: BatchStatus,
    businessDate: Date,
    extra: Partial<BatchListFilter> = {},
  ) {
    const result = await list({ ...extra, operationalStatus }, businessDate);
    return { ids: result.rows.map((row) => row.id), total: result.total };
  }

  async function snapshot(): Promise<Snapshot[]> {
    const result = await db().query(`
      SELECT id, qty_available::text, status, expired_date::text, is_non_batch
      FROM pg_temp.inventory_batches ORDER BY id
    `);
    return result.rows;
  }

  it('resolves inventory_batches only to this session TEMP schema', async () => {
    expect((await db().query('SHOW search_path')).rows).toEqual([{ search_path: 'pg_temp' }]);
    const result = await db().query(`
      SELECT relpersistence, relnamespace = pg_my_temp_schema() AS isolated
      FROM pg_catalog.pg_class WHERE oid = 'inventory_batches'::regclass
    `);
    expect(result.rows).toEqual([{ relpersistence: 't', isolated: true }]);
  });

  describe.each(['UTC', 'Asia/Jakarta'])('session timezone %s', (timezone) => {
    beforeEach(async () => {
      await db().query("SELECT set_config('TimeZone', $1, true)", [timezone]);
      expect((await db().query('SHOW TimeZone')).rows).toEqual([{ TimeZone: timezone }]);
      await addStandardBatches();
    });

    it.each([longPast, rolloverDay, upcomingDay, farFuture])(
      'reads expired_date %s as that UTC calendar day, not a host-local midnight',
      async (expiry) => {
        const { rows } = await list();
        const row = rows.find(
          (batch) => batch.expiredDate?.toISOString() === `${expiry}T00:00:00.000Z`,
        );
        expect(row).toBeDefined();
        for (const batch of rows.filter((item) => item.expiredDate)) {
          expect(batch.expiredDate?.toISOString().endsWith('T00:00:00.000Z')).toBe(true);
        }
      },
    );

    it('keeps a NULL expiry null and returns the same batch from the detail read', async () => {
      const listed = (await list()).rows.find((row) => row.batchNumber === 'B-NULL');
      expect(listed?.expiredDate).toBeNull();
      const detail = await repository.getBatchById(ids.get('B-NULL')!, companyId);
      expect(detail).toEqual(listed);
      expect(detail.receivedDate?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
      expect(detail.qtyAvailable).toBe(10);
      expect(detail.status).toBe('ACTIVE');
    });

    it('throws NOT_FOUND for another company without touching its rows', async () => {
      await expect(repository.getBatchById(ids.get('B-U')!, otherCompanyId)).rejects.toThrow(
        'INVENTORY_BATCH.NOT_FOUND',
      );
    });
  });

  describe('derived operational status', () => {
    beforeEach(async () => {
      await addStandardBatches();
    });

    it.each([
      ['before the WIB rollover', beforeRollover],
      ['after the WIB rollover', afterRollover],
    ])('agrees with the shared classifier for %s', async (_label, businessDate) => {
      const rows = (await list({}, businessDate)).rows;
      for (const status of ['ACTIVE', 'EXPIRED', 'QUARANTINE', 'CONSUMED'] as BatchStatus[]) {
        const { ids: sqlIds, total } = await bucketIds(status, businessDate);
        const tsIds = rows
          .filter((row) => derive(row, businessDate) === status)
          .map((row) => row.id);
        expect(sqlIds.sort()).toEqual(tsIds.sort());
        expect(total).toBe(tsIds.length);
      }
    });

    it('reads an ACTIVE past-expiry batch as EXPIRED and never rewrites QUARANTINE or CONSUMED', async () => {
      const rows = (await list()).rows;
      const byName = (name: string) =>
        derive(
          rows.find((row) => row.batchNumber === name)!,
          afterRollover,
        );
      expect(byName('B-N')).toBe('EXPIRED');
      expect(byName('B-N2')).toBe('EXPIRED');
      expect(byName('B-R')).toBe('EXPIRED'); // 2026-10-24 is past on WIB 2026-10-25
      expect(byName('B-U')).toBe('ACTIVE');
      expect(byName('B-FAR')).toBe('ACTIVE');
      expect(byName('B-NULL')).toBe('ACTIVE');
      expect(byName('X-OLD')).toBe('EXPIRED');
      expect(byName('X-FAR')).toBe('EXPIRED');
      expect(byName('Q-OLD')).toBe('QUARANTINE');
      expect(byName('C-OLD')).toBe('CONSUMED');
      expect((await list()).total).toBe(10);
    });

    it('keeps the rollover day usable until the WIB date advances', async () => {
      const before = (await list({}, beforeRollover)).rows.find(
        (row) => row.batchNumber === 'B-R',
      )!;
      const after = (await list({}, afterRollover)).rows.find((row) => row.batchNumber === 'B-R')!;
      expect(derive(before, beforeRollover)).toBe('ACTIVE');
      expect(derive(after, afterRollover)).toBe('EXPIRED');
    });

    it.each([
      ['before the WIB rollover', beforeRollover, ['B-N', 'B-N2', 'X-OLD', 'X-FAR']],
      ['after the WIB rollover', afterRollover, ['B-N', 'B-N2', 'B-R', 'X-OLD', 'X-FAR']],
    ])('filters the EXPIRED bucket %s', async (_label, businessDate, expected) => {
      const { ids: found, total } = await bucketIds('EXPIRED', businessDate);
      expect(found.sort()).toEqual(expected.map((name) => ids.get(name)!).sort());
      expect(total).toBe(expected.length);
    });

    it('never buckets a non-batch row as EXPIRED, even with a past date', async () => {
      const { ids: expired } = await bucketIds('EXPIRED', afterRollover, { includeNonBatch: true });
      expect(expired).not.toContain(ids.get('NB-OLD')!);
      const { ids: active } = await bucketIds('ACTIVE', afterRollover, { includeNonBatch: true });
      expect(active).toContain(ids.get('NB-OLD')!);
      expect(active.sort()).toEqual(
        ['B-U', 'B-FAR', 'B-NULL', 'NB-OLD'].map((name) => ids.get(name)!).sort(),
      );
    });

    it('keeps the legacy stored-status filter unchanged', async () => {
      const result = await list({ status: 'ACTIVE' });
      expect([...result.rows.map((row) => row.id)].sort()).toEqual(
        ['B-N', 'B-N2', 'B-R', 'B-U', 'B-FAR', 'B-NULL'].map((name) => ids.get(name)!).sort(),
      );
      expect(result.total).toBe(6);
    });

    it('combines scope filters with the operational bucket and paginates on the same predicate', async () => {
      await addBatch({ batchNumber: 'OTHER-OUTLET', expiry: longPast, outletId: otherOutletId });
      await addBatch({ batchNumber: 'OTHER-PRODUCT', expiry: longPast, productId: otherProductId });
      const filter = {
        operationalStatus: 'EXPIRED' as BatchStatus,
        outletId,
        productId,
        limit: 2,
        offset: 0,
      };
      const first = await repository.getBatches(companyId, { ...page, ...filter }, afterRollover);
      const full = (
        await repository.getBatches(companyId, { ...page, ...filter, limit: 50 }, afterRollover)
      ).rows;
      expect(first.total).toBe(full.length);
      expect(full).toHaveLength(5);
      expect(first.rows).toEqual(full.slice(0, 2));
      const second = await repository.getBatches(
        companyId,
        { ...page, ...filter, offset: 2 },
        afterRollover,
      );
      expect(second.total).toBe(full.length);
      expect(second.rows).toEqual(full.slice(2, 4));
      expect(
        (
          await repository.getBatches(
            companyId,
            { ...page, ...filter, offset: full.length },
            afterRollover,
          )
        ).rows,
      ).toEqual([]);
      expect(full.map((row) => row.batchNumber)).toEqual(
        expect.arrayContaining(['B-N', 'B-N2', 'B-R', 'X-OLD', 'X-FAR']),
      );
      expect(full.map((row) => row.batchNumber)).not.toContain('OTHER-OUTLET');
      expect(full.map((row) => row.batchNumber)).not.toContain('OTHER-PRODUCT');
      expect(
        (
          await repository.getBatches(otherCompanyId, { ...page, ...filter }, afterRollover)
        ).rows.map((row) => row.batchNumber),
      ).toEqual(['OTHER-CO']);
    });

    it('serves list and detail with the same bucket and leaves stored rows untouched', async () => {
      const before = await snapshot();
      const expired = (await bucketIds('EXPIRED', afterRollover)).ids;
      expect(expired).toHaveLength(5);
      for (const id of expired) {
        const detail = await repository.getBatchById(id, companyId);
        expect(derive(detail, afterRollover)).toBe('EXPIRED');
      }
      expect(await snapshot()).toEqual(before);
    });
  });

  describe('dashboard expiry buckets', () => {
    /** ACTIVE stock only: three past days, the rollover day, one upcoming day, one undated. */
    beforeEach(async () => {
      await addBatch({ batchNumber: 'D-1', expiry: longPast, qty: 1 });
      await addBatch({ batchNumber: 'D-2', expiry: '2026-10-20', qty: 1 });
      await addBatch({ batchNumber: 'D-3', expiry: '2026-10-01', qty: 1 });
      await addBatch({ batchNumber: 'D-R', expiry: rolloverDay, qty: 1 });
      await addBatch({ batchNumber: 'D-U', expiry: upcomingDay, qty: 1 });
      await addBatch({ batchNumber: 'D-NULL', expiry: null, qty: 1 });
      await addBatch({ batchNumber: 'D-FAR', expiry: farFuture, qty: 1 });
      await addBatch({ batchNumber: 'D-Q', expiry: longPast, qty: 5, status: 'QUARANTINE' });
      await db().query('INSERT INTO pg_temp.products (id, minimum_stock) VALUES ($1, 10)', [
        productId,
      ]);
    });

    it.each([
      ['before the WIB rollover', beforeRollover, 3, 2],
      ['after the WIB rollover', afterRollover, 4, 1],
    ] as const)(
      'buckets ACTIVE stock %s on the Jakarta business day',
      async (_label, businessDate, expiredCount, expiringSoonCount) => {
        expect(await repository.getDashboardSummary(companyId, businessDate)).toEqual({
          totalActiveBatches: 7,
          totalProductsInStock: 1,
          lowStockCount: 1,
          expiringSoonCount,
          expiredCount,
          inTransitTransfers: 0,
        });
      },
    );

    it('scopes every batch metric to one outlet', async () => {
      await addBatch({ batchNumber: 'D-OTHER', expiry: longPast, qty: 1, outletId: otherOutletId });
      expect(
        await repository.getDashboardSummary(companyId, afterRollover, outletId),
      ).toMatchObject({
        totalActiveBatches: 7,
        expiredCount: 4,
        expiringSoonCount: 1,
        lowStockCount: 1,
      });
      expect(await repository.getDashboardSummary(companyId, afterRollover, otherOutletId)).toEqual(
        {
          totalActiveBatches: 1,
          totalProductsInStock: 1,
          lowStockCount: 1,
          expiringSoonCount: 0,
          expiredCount: 1,
          inTransitTransfers: 0,
        },
      );
    });
  });
});
