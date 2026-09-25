import { ProductGroupRepositoryPostgres } from '../ProductGroupRepositoryPostgres';
import { Pool } from 'pg';
import { ProductGroup } from '../../../Domains/product-groups/entities/ProductGroup';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const groupRow = {
  id: 'pg-uuid',
  company_id: 'company-uuid',
  code: 'PG-001',
  name: 'Bahan Baku',
  description: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('ProductGroupRepositoryPostgres', () => {
  let repo: ProductGroupRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ProductGroupRepositoryPostgres(mockPool);
  });

  describe('addProductGroup', () => {
    it('should return a ProductGroup on success', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [groupRow], rowCount: 1 });

      const result = await repo.addProductGroup(
        { code: 'PG-001', name: 'Bahan Baku', description: null },
        'company-uuid',
      );

      expect(result).toBeInstanceOf(ProductGroup);
      expect(result.code).toBe('PG-001');
    });
  });

  describe('generateProductGroupCode', () => {
    it('should generate PG-001 when none exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });
      expect(await repo.generateProductGroupCode('company-uuid')).toBe('PG-001');
    });

    it('should pad to 3 digits', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '9' }] });
      expect(await repo.generateProductGroupCode('company-uuid')).toBe('PG-010');
    });
  });

  describe('getProductGroupsByCompany', () => {
    it('should return rows and total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [groupRow, groupRow], rowCount: 2 });

      const result = await repo.getProductGroupsByCompany('company-uuid', {
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(2);
      expect(result.rows).toHaveLength(2);
    });

    it('should apply search and isActive filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [groupRow], rowCount: 1 });

      await repo.getProductGroupsByCompany('company-uuid', {
        limit: 10,
        offset: 0,
        search: 'Bahan',
        isActive: true,
      });

      const countSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('is_active');
    });
  });

  describe('getProductGroupById', () => {
    it('should return a ProductGroup when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [groupRow], rowCount: 1 });
      const result = await repo.getProductGroupById('pg-uuid', 'company-uuid');
      expect(result.id).toBe('pg-uuid');
    });

    it('should throw NotFoundError when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getProductGroupById('x', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('updateProductGroup', () => {
    it('should return the updated ProductGroup when fields are provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [groupRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...groupRow, name: 'Renamed' }], rowCount: 1 });

      const result = await repo.updateProductGroup('pg-uuid', 'company-uuid', {
        name: 'Renamed',
      });

      expect(result.name).toBe('Renamed');
    });

    it('should return current state when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [groupRow], rowCount: 1 });

      const result = await repo.updateProductGroup('pg-uuid', 'company-uuid', {});

      expect(result.id).toBe('pg-uuid');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDeleteProductGroup', () => {
    it('should resolve when a row is updated', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await expect(
        repo.softDeleteProductGroup('pg-uuid', 'company-uuid'),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.softDeleteProductGroup('x', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('countActiveDependents', () => {
    it('should return the summed dependent count', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '3' }] });
      expect(await repo.countActiveDependents('pg-uuid', 'company-uuid')).toBe(3);
    });

    it('should query both categories and products', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });
      await repo.countActiveDependents('pg-uuid', 'company-uuid');
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('product_categories');
      expect(sql).toContain('products');
    });
  });
});
