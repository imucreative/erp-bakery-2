import { ProductRepositoryPostgres } from '../ProductRepositoryPostgres';
import { Pool } from 'pg';
import { Product } from '../../../Domains/products/entities/Product';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const productRow = {
  id: 'prod-uuid',
  company_id: 'company-uuid',
  sku: 'SKU-001',
  barcode: null,
  name: 'Roti Tawar',
  product_group_id: 'pg-uuid',
  category_id: 'cat-uuid',
  uom_id: 'uom-uuid',
  uom_name: 'Kilogram',
  supplier_id: 'sup-uuid',
  product_type: 'FINISHED_GOODS',
  purchase_price: '5000',
  selling_price: '12000',
  minimum_stock: '10',
  shelf_life_days: 3,
  is_batch_tracked: true,
  has_toppings: false,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

const newData = {
  sku: 'SKU-001',
  barcode: null,
  name: 'Roti Tawar',
  productGroupId: 'pg-uuid',
  categoryId: 'cat-uuid',
  uomId: 'uom-uuid',
  supplierId: 'sup-uuid',
  productType: 'FINISHED_GOODS',
  purchasePrice: 5000,
  sellingPrice: 12000,
  minimumStock: 10,
  shelfLifeDays: 3,
  isBatchTracked: true,
  hasToppings: false,
};

describe('ProductRepositoryPostgres', () => {
  let repo: ProductRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ProductRepositoryPostgres(mockPool);
  });

  describe('addProduct', () => {
    it('should return a Product on success', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [productRow], rowCount: 1 });
      const result = await repo.addProduct(newData, 'company-uuid');
      expect(result).toBeInstanceOf(Product);
      expect(result.sku).toBe('SKU-001');
      expect(result.purchasePrice).toBe(5000);
    });
  });

  describe('getProductsByCompany', () => {
    it('should return rows and total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [productRow], rowCount: 1 });

      const result = await repo.getProductsByCompany('company-uuid', { limit: 10, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].uomName).toBe('Kilogram');
      const selectSql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(selectSql).toContain('AS uom_name');
    });

    it('should apply search, isActive, productType, and FK filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [productRow], rowCount: 1 });

      await repo.getProductsByCompany('company-uuid', {
        limit: 10,
        offset: 0,
        search: 'Roti',
        isActive: true,
        productType: 'FINISHED_GOODS',
        productGroupId: 'pg-uuid',
        categoryId: 'cat-uuid',
        supplierId: 'sup-uuid',
      });

      const countSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('is_active');
      expect(countSql).toContain('product_type');
      expect(countSql).toContain('product_group_id');
      expect(countSql).toContain('category_id');
      expect(countSql).toContain('supplier_id');
    });
  });

  describe('getProductById', () => {
    it('should return a Product when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [productRow], rowCount: 1 });
      const result = await repo.getProductById('prod-uuid', 'company-uuid');
      expect(result.id).toBe('prod-uuid');
      expect(result.uomName).toBe('Kilogram');
    });

    it('should throw NotFoundError when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getProductById('x', 'company-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateProduct', () => {
    it('should return the updated Product when fields are provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [productRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...productRow, name: 'Roti Baru' }], rowCount: 1 });

      const result = await repo.updateProduct('prod-uuid', 'company-uuid', { name: 'Roti Baru' });
      expect(result.name).toBe('Roti Baru');
    });

    it('should map camelCase fields to snake_case columns', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [productRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...productRow, selling_price: '15000' }], rowCount: 1 });

      await repo.updateProduct('prod-uuid', 'company-uuid', { sellingPrice: 15000 });
      const updateSql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(updateSql).toContain('selling_price');
    });

    it('should return current state when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [productRow], rowCount: 1 });
      const result = await repo.updateProduct('prod-uuid', 'company-uuid', {});
      expect(result.id).toBe('prod-uuid');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDeleteProduct', () => {
    it('should resolve when a row is updated', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await expect(repo.softDeleteProduct('prod-uuid', 'company-uuid')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.softDeleteProduct('x', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('verifyAvailableSku', () => {
    it('should resolve when the SKU is available', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.verifyAvailableSku('SKU-NEW', 'company-uuid')).resolves.toBeUndefined();
    });

    it('should throw ConflictError when the SKU is taken', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'x' }], rowCount: 1 });
      await expect(repo.verifyAvailableSku('SKU-001', 'company-uuid')).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it('should exclude a given id from the check', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await repo.verifyAvailableSku('SKU-001', 'company-uuid', 'prod-uuid');
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('id <>');
    });
  });

  describe('verifyAvailableBarcode', () => {
    it('should resolve when the barcode is available', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.verifyAvailableBarcode('899', 'company-uuid')).resolves.toBeUndefined();
    });

    it('should throw ConflictError when the barcode is taken', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'x' }], rowCount: 1 });
      await expect(repo.verifyAvailableBarcode('899', 'company-uuid')).rejects.toBeInstanceOf(
        ConflictError,
      );
    });
  });
});
