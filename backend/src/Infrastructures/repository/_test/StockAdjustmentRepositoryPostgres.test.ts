import { Pool, PoolClient } from 'pg';
import { StockAdjustmentRepositoryPostgres } from '../StockAdjustmentRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 'adj-1',
    company_id: 'c1',
    outlet_id: 'o1',
    adjustment_number: 'ADJ-2026-000001',
    adjustment_date: new Date('2026-09-28'),
    status: 'APPROVED',
    notes: null,
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
    direction: 'OUT',
    qty: '3',
    reason: 'DAMAGED',
    reason_description: null,
    before_qty: null,
    after_qty: null,
    ...over,
  };
}

describe('StockAdjustmentRepositoryPostgres', () => {
  let repo: StockAdjustmentRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new StockAdjustmentRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('getById', () => {
    it('should throw NotFoundError when header missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should return adjustment with items', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }); // items

      const adj = await repo.getById('adj-1', 'c1');
      expect(adj.id).toBe('adj-1');
      expect(adj.items).toHaveLength(1);
      expect(adj.items[0].direction).toBe('OUT');
    });
  });

  describe('complete', () => {
    it('should post OUT movement, snapshot before/after, and flip to COMPLETED', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'APPROVED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '3' })], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [{ qty_available: '10' }], rowCount: 1 }) // lock batch
        .mockResolvedValueOnce({ rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rowCount: 1 }) // insert movement
        .mockResolvedValueOnce({ rowCount: 1 }) // update item snapshot
        .mockResolvedValueOnce({ rows: [header({ status: 'COMPLETED' })], rowCount: 1 }) // flip header
        .mockResolvedValueOnce({ rows: [itemRow({ before_qty: '10', after_qty: '7' })], rowCount: 1 }) // final items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.complete('adj-1', 'c1', 'user-1');

      expect(result.status).toBe('COMPLETED');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('should reject completion when status is not APPROVED', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.complete('adj-1', 'c1', 'user-1')).rejects.toThrow(
        'STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION',
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw INSUFFICIENT_STOCK when OUT would go negative', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'APPROVED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [itemRow({ qty: '20', direction: 'OUT' })], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [{ qty_available: '5' }], rowCount: 1 }) // lock batch (only 5)
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.complete('adj-1', 'c1', 'user-1')).rejects.toBeInstanceOf(InvariantError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw NotFoundError when header missing', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // lock header -> missing
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.complete('x', 'c1', 'user-1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('createDraft', () => {
    it('should generate number and insert header + items', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate number count
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // insert header
        .mockResolvedValueOnce({ rowCount: 1 }) // insert item
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // load items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.createDraft('c1', 'user-1', {
        outletId: 'o1',
        adjustmentDate: null,
        notes: null,
        items: [
          { batchId: 'batch-1', productId: 'prod-1', direction: 'OUT', qty: 3, reason: 'DAMAGED' },
        ],
      });

      expect(result.status).toBe('DRAFT');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
