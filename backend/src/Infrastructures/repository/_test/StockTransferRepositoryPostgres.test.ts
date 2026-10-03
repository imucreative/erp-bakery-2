import { Pool, PoolClient } from 'pg';
import { StockTransferRepositoryPostgres } from '../StockTransferRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    company_id: 'c1',
    source_outlet_id: 'src',
    destination_outlet_id: 'dst',
    transfer_number: 'TRF-2026-000001',
    transfer_date: new Date('2026-09-28'),
    status: 'SUBMITTED',
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    source_batch_id: 'src-batch',
    product_id: 'prod-1',
    qty: '4',
    batch_number: 'B-1',
    lot_key: '',
    lot_number: null,
    expired_date: new Date('2026-12-31'),
    destination_batch_id: null,
    ...over,
  };
}

describe('StockTransferRepositoryPostgres', () => {
  let repo: StockTransferRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new StockTransferRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('dispatch', () => {
    it('should decrement source, post TRANSFER_OUT, and flip to IN_TRANSIT', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'SUBMITTED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '4' })], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [{ qty_available: '10' }], rowCount: 1 }) // lock source batch
        .mockResolvedValueOnce({ rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rowCount: 1 }) // insert movement
        .mockResolvedValueOnce({ rows: [header({ status: 'IN_TRANSIT' })], rowCount: 1 }) // flip header
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // final items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.dispatch('t1', 'c1', 'u1');
      expect(result.status).toBe('IN_TRANSIT');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should reject dispatch when not SUBMITTED', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.dispatch('t1', 'c1', 'u1')).rejects.toThrow(
        'STOCK_TRANSFER.INVALID_STATUS_TRANSITION',
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw INSUFFICIENT_STOCK when source lacks quantity', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'SUBMITTED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '20' })], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [{ qty_available: '5' }], rowCount: 1 }) // source batch has 5
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.dispatch('t1', 'c1', 'u1')).rejects.toBeInstanceOf(InvariantError);
    });
  });

  describe('receive', () => {
    it('should increment existing destination batch and flip to COMPLETED', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'IN_TRANSIT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '4' })], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [{ id: 'dst-batch', qty_available: '2' }], rowCount: 1 }) // resolve dest batch (exists)
        .mockResolvedValueOnce({ rowCount: 1 }) // update dest batch
        .mockResolvedValueOnce({ rowCount: 1 }) // insert TRANSFER_IN movement
        .mockResolvedValueOnce({ rowCount: 1 }) // set destination_batch_id
        .mockResolvedValueOnce({ rows: [header({ status: 'COMPLETED' })], rowCount: 1 }) // flip header
        .mockResolvedValueOnce({ rows: [itemRow({ destination_batch_id: 'dst-batch' })], rowCount: 1 }) // final items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.receive('t1', 'c1', 'u1');
      expect(result.status).toBe('COMPLETED');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create destination batch when none exists', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'IN_TRANSIT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '4' })], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // resolve dest batch (missing)
        .mockResolvedValueOnce({ rows: [{ id: 'new-dst-batch' }], rowCount: 1 }) // create dest batch
        .mockResolvedValueOnce({ rowCount: 1 }) // insert TRANSFER_IN movement
        .mockResolvedValueOnce({ rowCount: 1 }) // set destination_batch_id
        .mockResolvedValueOnce({ rows: [header({ status: 'COMPLETED' })], rowCount: 1 }) // flip header
        .mockResolvedValueOnce({ rows: [itemRow({ destination_batch_id: 'new-dst-batch' })], rowCount: 1 }) // final
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.receive('t1', 'c1', 'u1');
      expect(result.status).toBe('COMPLETED');
    });

    it('should reject receive when not IN_TRANSIT', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'SUBMITTED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.receive('t1', 'c1', 'u1')).rejects.toThrow(
        'STOCK_TRANSFER.INVALID_STATUS_TRANSITION',
      );
    });

    it('should map a duplicate source-key violation (23505) to INVENTORY.DUPLICATE_MOVEMENT_SOURCE', async () => {
      // Replaying the same receive (TRANSFER_IN with the same source key) must
      // still be rejected by the partial unique index — now keyed on
      // (movement_type, source_document_type, source_document_id, item, allocation).
      const dupError = Object.assign(new Error('duplicate key value'), { code: '23505' });
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'IN_TRANSIT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '4' })], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [{ id: 'dst-batch', qty_available: '2' }], rowCount: 1 }) // resolve dest batch
        .mockResolvedValueOnce({ rowCount: 1 }) // update dest batch
        .mockRejectedValueOnce(dupError) // insert TRANSFER_IN movement -> 23505
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.receive('t1', 'c1', 'u1')).rejects.toThrow(
        'INVENTORY.DUPLICATE_MOVEMENT_SOURCE',
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('dispatch then receive (regression: index must include movement_type)', () => {
    it('should post TRANSFER_OUT on dispatch and TRANSFER_IN on receive without a source-key collision', async () => {
      // Regression for bug INVENTORY.DUPLICATE_MOVEMENT_SOURCE: before the index
      // fix, TRANSFER_IN shared the same source key as TRANSFER_OUT (identical
      // except movement_type) and collided. With movement_type part of the key,
      // the two directions coexist. This test asserts both inserts specify a
      // distinct movement_type and both transitions complete.

      // --- dispatch ---
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'SUBMITTED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '4' })], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [{ qty_available: '10' }], rowCount: 1 }) // lock source batch
        .mockResolvedValueOnce({ rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rowCount: 1 }) // insert TRANSFER_OUT movement
        .mockResolvedValueOnce({ rows: [header({ status: 'IN_TRANSIT' })], rowCount: 1 }) // flip header
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // final items
        .mockResolvedValueOnce(undefined); // COMMIT

      const dispatched = await repo.dispatch('t1', 'c1', 'u1');
      expect(dispatched.status).toBe('IN_TRANSIT');

      const outInsert = client.query.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO inventory_movements'),
      );
      expect(outInsert).toBeDefined();
      expect(outInsert[0]).toContain("'TRANSFER_OUT'");

      jest.clearAllMocks();
      (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);

      // --- receive (same transfer, same source key, different movement_type) ---
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'IN_TRANSIT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '4' })], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [{ id: 'dst-batch', qty_available: '2' }], rowCount: 1 }) // resolve dest batch
        .mockResolvedValueOnce({ rowCount: 1 }) // update dest batch
        .mockResolvedValueOnce({ rowCount: 1 }) // insert TRANSFER_IN movement (no collision)
        .mockResolvedValueOnce({ rowCount: 1 }) // set destination_batch_id
        .mockResolvedValueOnce({ rows: [header({ status: 'COMPLETED' })], rowCount: 1 }) // flip header
        .mockResolvedValueOnce({ rows: [itemRow({ destination_batch_id: 'dst-batch' })], rowCount: 1 }) // final
        .mockResolvedValueOnce(undefined); // COMMIT

      const received = await repo.receive('t1', 'c1', 'u1');
      expect(received.status).toBe('COMPLETED');

      const inInsert = client.query.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO inventory_movements'),
      );
      expect(inInsert).toBeDefined();
      expect(inInsert[0]).toContain("'TRANSFER_IN'");
    });
  });

  describe('getById', () => {
    it('should throw NotFoundError when header missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
