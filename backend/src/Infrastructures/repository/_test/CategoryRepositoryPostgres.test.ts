import { CategoryRepositoryPostgres } from '../CategoryRepositoryPostgres';
import { Pool } from 'pg';
import { ProductCategory } from '../../../Domains/categories/entities/ProductCategory';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const categoryRow = {
  id: 'cat-uuid',
  company_id: 'company-uuid',
  product_group_id: 'pg-uuid',
  code: 'PC-001',
  name: 'Roti Manis',
  description: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('CategoryRepositoryPostgres', () => {
  let repo: CategoryRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new CategoryRepositoryPostgres(mockPool);
  });

  describe('addCategory', () => {
    it('should return a ProductCategory on success', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [categoryRow], rowCount: 1 });
      const result = await repo.addCategory(
        { code: 'PC-001', name: 'Roti Manis', description: null, productGroupId: 'pg-uuid' },
        'company-uuid',
      );
      expect(result).toBeInstanceOf(ProductCategory);
      expect(result.code).toBe('PC-001');
      expect(result.productGroupId).toBe('pg-uuid');
    });
  });

  describe('generateCategoryCode', () => {
    it('should generate PC-001 when none exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });
      expect(await repo.generateCategoryCode('company-uuid')).toBe('PC-001');
    });

    it('should pad to 3 digits', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '9' }] });
      expect(await repo.generateCategoryCode('company-uuid')).toBe('PC-010');
    });
  });

  describe('getCategoriesByCompany', () => {
    it('should return rows and total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [categoryRow], rowCount: 1 });

      const result = await repo.getCategoriesByCompany('company-uuid', { limit: 10, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.rows).toHaveLength(1);
    });

    it('should apply search, isActive, and productGroupId filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [categoryRow], rowCount: 1 });

      await repo.getCategoriesByCompany('company-uuid', {
        limit: 10,
        offset: 0,
        search: 'Roti',
        isActive: true,
        productGroupId: 'pg-uuid',
      });

      const countSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('is_active');
      expect(countSql).toContain('product_group_id');
    });
  });

  describe('getCategoryById', () => {
    it('should return a ProductCategory when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [categoryRow], rowCount: 1 });
      const result = await repo.getCategoryById('cat-uuid', 'company-uuid');
      expect(result.id).toBe('cat-uuid');
    });

    it('should throw NotFoundError when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getCategoryById('x', 'company-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateCategory', () => {
    it('should return the updated ProductCategory when fields are provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [categoryRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...categoryRow, name: 'Roti Baru' }], rowCount: 1 });

      const result = await repo.updateCategory('cat-uuid', 'company-uuid', { name: 'Roti Baru' });
      expect(result.name).toBe('Roti Baru');
    });

    it('should return current state when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [categoryRow], rowCount: 1 });
      const result = await repo.updateCategory('cat-uuid', 'company-uuid', {});
      expect(result.id).toBe('cat-uuid');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDeleteCategory', () => {
    it('should resolve when a row is updated', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await expect(repo.softDeleteCategory('cat-uuid', 'company-uuid')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.softDeleteCategory('x', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('countActiveDependents', () => {
    it('should return the dependent product count', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '3' }] });
      expect(await repo.countActiveDependents('cat-uuid', 'company-uuid')).toBe(3);
    });

    it('should query the products table by category_id', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });
      await repo.countActiveDependents('cat-uuid', 'company-uuid');
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('products');
      expect(sql).toContain('category_id');
    });
  });
});
