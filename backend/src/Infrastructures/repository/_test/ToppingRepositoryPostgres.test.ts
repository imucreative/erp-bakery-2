import { Pool } from 'pg';
import { ToppingRepositoryPostgres } from '../ToppingRepositoryPostgres';
import { Topping } from '../../../Domains/toppings/entities/Topping';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const row = {
  id: 'tg1',
  company_id: 'c1',
  topping_product_id: 't1',
  default_qty_per_item: '25.000',
  extra_price: '2000.00',
  sort_order: 0,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  topping_name: 'Selai',
  topping_sku: 'TOP-001',
  uom_id: 'uom1',
  uom_code: 'GR',
};

describe('ToppingRepositoryPostgres', () => {
  let repo: ToppingRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ToppingRepositoryPostgres(mockPool);
  });

  describe('list / listActive', () => {
    it('list returns mapped Topping entities', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [row], rowCount: 1 });
      const result = await repo.list('c1');
      expect(result[0]).toBeInstanceOf(Topping);
      expect(result[0].defaultQtyPerItem).toBe(25);
      expect(result[0].extraPrice).toBe(2000);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).not.toContain('is_active = TRUE');
    });

    it('listActive filters to active entries only', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [row], rowCount: 1 });
      const result = await repo.listActive('c1');
      expect(result).toHaveLength(1);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('is_active = TRUE');
    });
  });

  describe('getById', () => {
    it('returns a Topping when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [row], rowCount: 1 });
      const result = await repo.getById('tg1', 'c1');
      expect(result.id).toBe('tg1');
    });

    it('throws NotFoundError when missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('add', () => {
    it('inserts and returns the created entry', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'tg1' }], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 }); // getById
      const result = await repo.add(
        {
          toppingProductId: 't1',
          defaultQtyPerItem: 25,
          extraPrice: 2000,
          sortOrder: 0,
          isActive: true,
          createdBy: 'u1',
        },
        'c1',
      );
      expect(result.id).toBe('tg1');
    });

    it('maps a 23505 unique violation to TOPPING.DUPLICATE', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce({ code: '23505' });
      await expect(
        repo.add(
          {
            toppingProductId: 't1',
            defaultQtyPerItem: 25,
            extraPrice: 2000,
            sortOrder: 0,
            isActive: true,
            createdBy: 'u1',
          },
          'c1',
        ),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('update', () => {
    it('updates mutable fields and returns the refreshed entry', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 }) // getById guard
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ ...row, extra_price: '2500.00' }], rowCount: 1 }); // getById
      const result = await repo.update('tg1', 'c1', { extraPrice: 2500 }, 'u1');
      expect(result.extraPrice).toBe(2500);
      const updateSql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(updateSql).toContain('extra_price =');
      expect(updateSql).toContain('updated_by =');
    });
  });

  describe('remove', () => {
    it('deletes the entry', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      await expect(repo.remove('tg1', 'c1')).resolves.toBeUndefined();
    });

    it('throws NotFoundError when nothing was deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      await expect(repo.remove('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
