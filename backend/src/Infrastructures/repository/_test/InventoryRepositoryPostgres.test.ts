import { Pool, PoolClient } from 'pg';
import { InventoryRepositoryPostgres } from '../InventoryRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';
import { MovementDraft } from '../../../Domains/inventory/InventoryRepository';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function batchRow(over: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    company_id: 'c1',
    outlet_id: 'o1',
    product_id: 'p1',
    batch_number: 'B-1',
    lot_key: '',
    lot_number: null,
    expired_date: new Date('2026-12-31'),
    received_date: new Date('2026-01-01'),
    qty_available: '10',
    status: 'ACTIVE',
    is_non_batch: false,
    ...over,
  };
}

describe('InventoryRepositoryPostgres', () => {
  let repo: InventoryRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new InventoryRepositoryPostgres(mockPool);
  });

  describe('getStockOnHand', () => {
    it.each([false, true])('sums non-expired ACTIVE batches with lowOnly=%s', async (lowOnly) => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              product_id: 'p1',
              product_sku: 'SKU-1',
              product_name: 'Waffle',
              outlet_id: 'o1',
              outlet_name: 'Outlet Utama',
              uom_id: 'u1',
              uom_code: 'PCS',
              uom_name: 'Pieces',
              qty_available: '4',
              minimum_stock: '5',
            },
          ],
        });

      const result = await repo.getStockOnHand(
        'c1',
        { limit: 20, offset: 0, outletId: 'o1', lowOnly },
        new Date('2026-10-27T17:00:00.000Z'),
      );

      expect(result.rows[0]).toMatchObject({ qtyAvailable: 4, isLow: true });
      for (const [sql] of (mockPool.query as jest.Mock).mock.calls) {
        expect(sql as string).toContain("b.status = 'ACTIVE'");
        expect(sql as string).toContain('b.expired_date IS NULL OR b.expired_date >= $2::date');
        expect(sql as string).not.toContain('CURRENT_DATE');
      }
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual([
        'c1',
        '2026-10-28',
        'o1',
      ]);
      expect((mockPool.query as jest.Mock).mock.calls[1][1]).toEqual([
        'c1',
        '2026-10-28',
        'o1',
        20,
        0,
      ]);
    });
  });

  describe('getBatchById', () => {
    it('should return an InventoryBatch when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [batchRow()], rowCount: 1 });

      const batch = await repo.getBatchById('b1', 'c1');
      expect(batch.id).toBe('b1');
      expect(batch.qtyAvailable).toBe(10);
    });

    it('should throw NotFoundError when missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getBatchById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('planFefoAllocation', () => {
    it('should allocate from nearest expiry first across batches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          batchRow({ id: 'near', expired_date: new Date('2026-02-01'), qty_available: '3' }),
          batchRow({ id: 'far', expired_date: new Date('2026-05-01'), qty_available: '10' }),
        ],
        rowCount: 2,
      });

      const plan = await repo.planFefoAllocation('c1', 'o1', 'p1', 5, new Date('2026-01-01'));

      expect(plan).toHaveLength(2);
      expect(plan[0]).toMatchObject({ batchId: 'near', qty: 3 });
      expect(plan[1]).toMatchObject({ batchId: 'far', qty: 2 });
    });

    it('should allocate fully from a single batch when sufficient', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [batchRow({ id: 'only', qty_available: '10' })],
        rowCount: 1,
      });

      const plan = await repo.planFefoAllocation('c1', 'o1', 'p1', 4, new Date('2026-01-01'));
      expect(plan).toEqual([expect.objectContaining({ batchId: 'only', qty: 4 })]);
    });

    it('should throw INSUFFICIENT_STOCK (InvariantError) when not enough stock', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [batchRow({ qty_available: '2' })],
        rowCount: 1,
      });

      await expect(
        repo.planFefoAllocation('c1', 'o1', 'p1', 5, new Date('2026-01-01')),
      ).rejects.toBeInstanceOf(InvariantError);
    });

    it('should throw INSUFFICIENT_STOCK when no batches available', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        repo.planFefoAllocation('c1', 'o1', 'p1', 1, new Date('2026-01-01')),
      ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
    });
  });

  describe('postMovements', () => {
    let client: { query: jest.Mock; release: jest.Mock };

    beforeEach(() => {
      client = { query: jest.fn(), release: jest.fn() };
      (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
    });

    it('should return empty array for no drafts without touching the pool', async () => {
      const result = await repo.postMovements('c1', []);
      expect(result).toEqual([]);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should apply an inbound movement and commit', async () => {
      const draft: MovementDraft = {
        outletId: 'o1',
        batchId: 'b1',
        productId: 'p1',
        movementType: 'PURCHASE',
        qty: 5,
      };

      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [batchRow({ qty_available: '10' })], rowCount: 1 }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE batch
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'm1', company_id: 'c1', outlet_id: 'o1', batch_id: 'b1', product_id: 'p1',
              movement_type: 'PURCHASE', qty: '5', before_qty: '10', after_qty: '15',
              source_document_type: null, source_document_id: null, notes: null,
              user_id: null, created_at: new Date(),
            },
          ],
          rowCount: 1,
        }) // INSERT movement
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.postMovements('c1', [draft]);

      expect(result).toHaveLength(1);
      expect(result[0].afterQty).toBe(15);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('should rollback and throw INSUFFICIENT_STOCK when outbound exceeds balance', async () => {
      const draft: MovementDraft = {
        outletId: 'o1',
        batchId: 'b1',
        productId: 'p1',
        movementType: 'SALE',
        qty: 20,
      };

      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [batchRow({ qty_available: '10' })], rowCount: 1 }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.postMovements('c1', [draft])).rejects.toThrow(
        'INVENTORY.INSUFFICIENT_STOCK',
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('should rollback and throw NotFoundError when batch missing', async () => {
      const draft: MovementDraft = {
        outletId: 'o1', batchId: 'x', productId: 'p1', movementType: 'PURCHASE', qty: 1,
      };

      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT FOR UPDATE -> not found
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.postMovements('c1', [draft])).rejects.toBeInstanceOf(NotFoundError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should translate duplicate source key (23505) into DUPLICATE_MOVEMENT_SOURCE', async () => {
      const draft: MovementDraft = {
        outletId: 'o1', batchId: 'b1', productId: 'p1', movementType: 'PURCHASE', qty: 1,
        sourceDocumentType: 'GOODS_RECEIPT', sourceDocumentId: 'gr1',
      };

      const dupErr = Object.assign(new Error('dup'), { code: '23505' });
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [batchRow()], rowCount: 1 }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        .mockRejectedValueOnce(dupErr) // INSERT -> conflict
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.postMovements('c1', [draft])).rejects.toThrow(
        'INVENTORY.DUPLICATE_MOVEMENT_SOURCE',
      );
    });
  });
});
