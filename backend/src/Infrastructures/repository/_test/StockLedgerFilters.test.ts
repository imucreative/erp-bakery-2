import { Pool, PoolClient } from 'pg';
import pool from '../../database/pool';
import { InventoryRepositoryPostgres } from '../InventoryRepositoryPostgres';
import { LedgerFilter } from '../../../Domains/inventory/InventoryRepository';

const syntheticId = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const companyId = syntheticId(1);
const outletId = syntheticId(2);
const productId = syntheticId(3);
const batchId = syntheticId(4);
const page = { limit: 20, offset: 0 };
const day = { dateFrom: '2026-10-25', dateTo: '2026-10-25' };

interface MovementFixture {
  companyId?: string;
  outletId?: string;
  productId?: string;
  batchId?: string;
  movementType?: string;
  createdAt?: string;
}

describe('stock ledger filters (real PostgreSQL, TEMP table only)', () => {
  let client: PoolClient | undefined;
  let repository: InventoryRepositoryPostgres;
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
      CREATE TEMP TABLE inventory_movements (
        id uuid PRIMARY KEY, company_id uuid NOT NULL, outlet_id uuid NOT NULL,
        batch_id uuid NOT NULL, product_id uuid NOT NULL, movement_type varchar NOT NULL,
        qty numeric NOT NULL, before_qty numeric NOT NULL, after_qty numeric NOT NULL,
        source_document_type varchar, source_document_id uuid, notes text, user_id uuid,
        created_at timestamp without time zone NOT NULL
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

  async function addMovement(fixture: MovementFixture = {}) {
    const id = syntheticId(sequence++);
    // Explicit TEMP target and timestamp strings preserve PostgreSQL microseconds.
    await db().query(
      `INSERT INTO pg_temp.inventory_movements
        (id, company_id, outlet_id, product_id, batch_id, movement_type,
         qty, before_qty, after_qty, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1.25, 10, 11.25, $7::timestamp)`,
      [
        id,
        fixture.companyId ?? companyId,
        fixture.outletId ?? outletId,
        fixture.productId ?? productId,
        fixture.batchId ?? batchId,
        fixture.movementType ?? 'SALE_RETURN',
        fixture.createdAt ?? '2026-10-25 03:00:00.123456',
      ],
    );
    return id;
  }

  async function expectIds(
    filter: LedgerFilter,
    expectedIds: string[],
    total = expectedIds.length,
  ) {
    const result = await repository.getLedger(companyId, filter);
    expect(result.total).toBe(total);
    expect(result.rows.map((row) => row.id)).toEqual(expectedIds);
    return result;
  }

  it('resolves inventory_movements only to this session TEMP schema', async () => {
    expect((await db().query('SHOW search_path')).rows).toEqual([{ search_path: 'pg_temp' }]);
    const result = await db().query(`
      SELECT relpersistence, relnamespace = pg_my_temp_schema() AS isolated
      FROM pg_catalog.pg_class WHERE oid = 'inventory_movements'::regclass
    `);
    expect(result.rows).toEqual([{ relpersistence: 't', isolated: true }]);
  });

  describe.each(['UTC', 'Asia/Jakarta'])('session timezone %s', (timezone) => {
    beforeEach(async () => {
      await db().query("SELECT set_config('TimeZone', $1, true)", [timezone]);
      expect((await db().query('SHOW TimeZone')).rows).toEqual([{ TimeZone: timezone }]);
    });

    it.each<{ name: string; dates: Partial<LedgerFilter>; indexes: number[] }>([
      { name: 'same WIB day', dates: day, indexes: [4, 3, 2, 1] },
      { name: 'from only', dates: { dateFrom: day.dateFrom }, indexes: [6, 5, 4, 3, 2, 1] },
      { name: 'to only', dates: { dateTo: day.dateTo }, indexes: [4, 3, 2, 1, 0] },
      { name: 'no dates', dates: {}, indexes: [6, 5, 4, 3, 2, 1, 0] },
      {
        name: 'multiple WIB days',
        dates: { dateFrom: '2026-10-24', dateTo: '2026-10-26' },
        indexes: [6, 5, 4, 3, 2, 1, 0],
      },
    ])('filters $name at UTC 17:00 with microsecond precision', async ({ dates, indexes }) => {
      const ids: string[] = [];
      for (const createdAt of [
        '2026-10-24 16:59:59.999999',
        '2026-10-24 17:00:00.000000',
        '2026-10-24 17:00:00.000001',
        '2026-10-25 00:00:00.000000',
        '2026-10-25 16:59:59.999999',
        '2026-10-25 17:00:00.000000',
        '2026-10-25 17:00:00.000001',
      ]) {
        ids.push(await addMovement({ createdAt }));
      }
      await expectIds(
        { ...page, ...dates },
        indexes.map((index) => ids[index]),
      );
    });

    it('serializes timestamp-without-timezone as its true UTC instant', async () => {
      const id = await addMovement({ createdAt: '2026-10-24 17:00:00.123456' });
      const result = await expectIds({ ...page, ...day }, [id]);
      expect(result.rows[0].createdAt).toBeInstanceOf(Date);
      expect(result.rows[0].createdAt.toISOString()).toBe('2026-10-24T17:00:00.123Z');
      expect(JSON.parse(JSON.stringify(result)).rows[0]).toEqual(
        expect.objectContaining({
          createdAt: '2026-10-24T17:00:00.123Z',
          qty: 1.25,
          beforeQty: 10,
          afterQty: 11.25,
        }),
      );
    });
  });

  it.each(['SALE_RETURN', 'RETURN'])(
    'keeps %s distinct from the other return type',
    async (type) => {
      const saleReturn = await addMovement({ movementType: 'SALE_RETURN' });
      const purchaseReturn = await addMovement({ movementType: 'RETURN' });
      await addMovement({ movementType: 'SALE' });
      const result = await expectIds({ ...page, ...day, movementType: type }, [
        type === 'SALE_RETURN' ? saleReturn : purchaseReturn,
      ]);
      expect(result.rows[0].movementType).toBe(type);
    },
  );

  it('combines every scope/type/date filter with consistent paginated rows and counts', async () => {
    const ids: string[] = [];
    for (const createdAt of [
      '2026-10-24 17:00:00',
      '2026-10-25 03:00:00',
      '2026-10-25 16:59:59.999999',
    ]) {
      ids.push(await addMovement({ createdAt }));
    }
    // Each decoy differs in exactly one predicate, including both date boundaries.
    for (const fixture of [
      { companyId: syntheticId(11) },
      { outletId: syntheticId(12) },
      { productId: syntheticId(13) },
      { batchId: syntheticId(14) },
      { movementType: 'RETURN' },
      { createdAt: '2026-10-24 16:59:59.999999' },
      { createdAt: '2026-10-25 17:00:00' },
    ]) {
      await addMovement(fixture);
    }
    const filter: LedgerFilter = {
      ...page,
      ...day,
      outletId,
      productId,
      batchId,
      movementType: 'SALE_RETURN',
    };
    await expectIds(filter, [ids[2], ids[1], ids[0]]);
    for (let offset = 0; offset < 3; offset++) {
      await expectIds({ ...filter, limit: 1, offset }, [ids[2 - offset]], 3);
    }
    await expectIds({ ...filter, limit: 1, offset: 3 }, [], 3);
  });

  it('returns empty rows and zero total for no matching dates or an empty ledger', async () => {
    await expectIds({ ...page, ...day }, []);
    await addMovement();
    await expectIds({ ...page, dateFrom: '2026-10-26', dateTo: '2026-10-26' }, []);
    await expectIds({ ...page, productId: syntheticId(99) }, []);
  });
});
