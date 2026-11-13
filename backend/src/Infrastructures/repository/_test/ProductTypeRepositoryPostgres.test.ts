import { Pool } from 'pg';
import { ProductTypeRepositoryPostgres } from '../ProductTypeRepositoryPostgres';
import { ProductType } from '../../../Domains/product-types/entities/ProductType';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const row = {
  code: 'FINISHED_GOODS',
  name: 'Barang Jadi',
  description: 'Produk jadi yang dijual atau diproduksi.',
  sort_order: 20,
  is_active: true,
};

const newData = {
  code: 'FINISHED_GOODS',
  name: 'Barang Jadi',
  description: 'Produk jadi yang dijual atau diproduksi.',
  sortOrder: 20,
  isActive: true,
};

describe('ProductTypeRepositoryPostgres', () => {
  let repo: ProductTypeRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ProductTypeRepositoryPostgres(mockPool);
  });

  describe('listActive', () => {
    it('should map active rows ordered by name', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [row], rowCount: 1 });

      const result = await repo.listActive();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ProductType);
      expect(result[0]).toMatchObject({
        code: 'FINISHED_GOODS',
        name: 'Barang Jadi',
        sortOrder: 20,
        isActive: true,
      });
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('WHERE is_active = TRUE');
      expect(sql).toContain('ORDER BY name ASC');
    });
  });

  describe('listAll', () => {
    it('should return active and inactive rows without an active filter', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [row], rowCount: 1 });

      const result = await repo.listAll();

      expect(result).toHaveLength(1);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).not.toContain('WHERE is_active = TRUE');
      expect(sql).toContain('ORDER BY name ASC');
    });
  });

  describe('isActive', () => {
    it('should return true when the code exists and is active', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
      await expect(repo.isActive('FINISHED_GOODS')).resolves.toBe(true);
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual(['FINISHED_GOODS']);
    });

    it('should return false when the code is missing or inactive', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.isActive('UNKNOWN')).resolves.toBe(false);
    });
  });

  describe('getByCode', () => {
    it('should return a ProductType when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [row], rowCount: 1 });
      const result = await repo.getByCode('FINISHED_GOODS');
      expect(result.code).toBe('FINISHED_GOODS');
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual(['FINISHED_GOODS']);
    });

    it('should throw NotFoundError when missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getByCode('UNKNOWN')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('addProductType', () => {
    it('should insert and return the product type', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [row], rowCount: 1 });
      const result = await repo.addProductType(newData);
      expect(result).toBeInstanceOf(ProductType);
      expect(result.code).toBe('FINISHED_GOODS');
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual([
        'FINISHED_GOODS',
        'Barang Jadi',
        'Produk jadi yang dijual atau diproduksi.',
        20,
        true,
      ]);
    });

    it('should map a unique violation to CODE_ALREADY_USED', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue({ code: '23505' });
      await expect(repo.addProductType(newData)).rejects.toBeInstanceOf(ConflictError);
      await expect(repo.addProductType(newData)).rejects.toThrow('PRODUCT_TYPE.CODE_ALREADY_USED');
    });
  });

  describe('updateProductType', () => {
    it('should update provided fields and return the row', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...row, name: 'Barang Jadi Baru', is_active: false }],
          rowCount: 1,
        });

      const result = await repo.updateProductType('FINISHED_GOODS', {
        name: 'Barang Jadi Baru',
        isActive: false,
      });

      expect(result.name).toBe('Barang Jadi Baru');
      expect(result.isActive).toBe(false);
      const updateSql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(updateSql).toContain('name =');
      expect(updateSql).toContain('is_active =');
      expect(updateSql).toContain('updated_at = NOW()');
    });

    it('should return the existing row when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [row], rowCount: 1 });
      const result = await repo.updateProductType('FINISHED_GOODS', {});
      expect(result.code).toBe('FINISHED_GOODS');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError when the code is missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.updateProductType('UNKNOWN', { name: 'X' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('deleteProductType', () => {
    it('should delete when unused', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await expect(repo.deleteProductType('FINISHED_GOODS')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.deleteProductType('UNKNOWN')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should map the product FK violation to IN_USE', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue({
        code: '23503',
        constraint: 'products_product_type_fk',
      });
      await expect(repo.deleteProductType('FINISHED_GOODS')).rejects.toBeInstanceOf(ConflictError);
      await expect(repo.deleteProductType('FINISHED_GOODS')).rejects.toThrow(
        'PRODUCT_TYPE.IN_USE',
      );
    });
  });
});
