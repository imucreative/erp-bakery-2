import { Pool, PoolClient } from 'pg';
import { StockOpnameRepositoryPostgres } from '../StockOpnameRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    company_id: 'c1',
    outlet_id: 'out1',
    opname_number: 'OPN-2026-000001',
    opname_date: new Date('2026-09-28'),
    status: 'APPROVED',
    notes: null,
    generated_adjustment_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    batch_id: 'batch-1',
    product_id: 'prod-1',
    system_qty: '10',
    counted_qty: '7',
    difference_qty: '-3',
    ...over,
  };
}

describe('StockOpnameRepositoryPostgres', () => {
  let repo: StockOpnameRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new StockOpnameRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('start', () => {
    it('should snapshot batches and flip to COUNTING', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no lock clash
        .mockResolvedValueOnce({ rowCount: 5 }) // snapshot insert
        .mockResolvedValueOnce({ rows: [header({ status: 'COUNTING' })], rowCount: 1 }) // flip
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // load items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.start('o1', 'c1', 'u1');
      expect(result.status).toBe('COUNTING');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw OUTLET_LOCKED when another opname locks the outlet', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [{ id: 'other' }], rowCount: 1 }) // lock clash
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.start('o1', 'c1', 'u1')).rejects.toThrow('STOCK_OPNAME.OUTLET_LOCKED');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject start when not DRAFT', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'COUNTING' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.start('o1', 'c1', 'u1')).rejects.toThrow(
        'STOCK_OPNAME.INVALID_STATUS_TRANSITION',
      );
    });
  });

  describe('complete', () => {
    it('should generate an adjustment and post ADJUSTMENT_OUT for a shortage', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'APPROVED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ difference_qty: '-3', counted_qty: '7' })], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate adj number
        .mockResolvedValueOnce({ rows: [{ id: 'adj-1' }], rowCount: 1 }) // insert adjustment header
        .mockResolvedValueOnce({ rows: [{ qty_available: '10' }], rowCount: 1 }) // lock batch
        .mockResolvedValueOnce({ rows: [{ id: 'adj-item-1' }], rowCount: 1 }) // insert adjustment item
        .mockResolvedValueOnce({ rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rowCount: 1 }) // insert movement
        .mockResolvedValueOnce({ rows: [header({ status: 'COMPLETED', generated_adjustment_id: 'adj-1' })], rowCount: 1 }) // flip
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // final items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.complete('o1', 'c1', 'u1');
      expect(result.status).toBe('COMPLETED');
      expect(result.generatedAdjustmentId).toBe('adj-1');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should complete with no adjustment when variance is zero', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'APPROVED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ difference_qty: '0', counted_qty: '10' })], rowCount: 1 }) // items, zero variance
        .mockResolvedValueOnce({ rows: [header({ status: 'COMPLETED' })], rowCount: 1 }) // flip
        .mockResolvedValueOnce({ rows: [itemRow({ difference_qty: '0' })], rowCount: 1 }) // final items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.complete('o1', 'c1', 'u1');
      expect(result.status).toBe('COMPLETED');
      expect(result.generatedAdjustmentId).toBeNull();
    });

    it('should reject complete when not APPROVED', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'SUBMITTED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.complete('o1', 'c1', 'u1')).rejects.toThrow(
        'STOCK_OPNAME.INVALID_STATUS_TRANSITION',
      );
    });
  });

  describe('getById', () => {
    it('should throw NotFoundError when missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('recordCount', () => {
    it('should reject when opname is not COUNTING', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.recordCount('o1', 'item-1', 'c1', 5)).rejects.toBeInstanceOf(
        InvariantError,
      );
    });
  });
});
