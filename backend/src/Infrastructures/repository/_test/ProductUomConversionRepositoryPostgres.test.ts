import { ProductUomConversionRepositoryPostgres } from '../ProductUomConversionRepositoryPostgres';
import { Pool } from 'pg';
import { ProductUomConversion } from '../../../Domains/product-uom-conversions/entities/ProductUomConversion';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const conversionRow = {
  id: 'conv-uuid',
  company_id: 'company-uuid',
  product_id: 'prod-uuid',
  uom_id: 'alt-uom-uuid',
  factor_to_base: '25000',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  uom_code: 'UOM-050',
  uom_name: 'Karung',
};

describe('ProductUomConversionRepositoryPostgres', () => {
  let repo: ProductUomConversionRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ProductUomConversionRepositoryPostgres(mockPool);
  });

  describe('listByProduct', () => {
    it('should map rows to entities', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [conversionRow], rowCount: 1 });
      const result = await repo.listByProduct('prod-uuid', 'company-uuid');
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ProductUomConversion);
      expect(result[0].factorToBase).toBe(25000);
      expect(result[0].uomName).toBe('Karung');
    });
  });

  describe('getById', () => {
    it('should return the entity when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [conversionRow], rowCount: 1 });
      const result = await repo.getById('conv-uuid', 'prod-uuid', 'company-uuid');
      expect(result.id).toBe('conv-uuid');
    });

    it('should throw NotFoundError when absent', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'prod-uuid', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('add', () => {
    it('should insert then re-read the row', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'conv-uuid' }], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [conversionRow], rowCount: 1 }); // getById

      const result = await repo.add(
        { productId: 'prod-uuid', uomId: 'alt-uom-uuid', factorToBase: 25000, isActive: true },
        'company-uuid',
      );
      expect(result).toBeInstanceOf(ProductUomConversion);
      expect(result.uomCode).toBe('UOM-050');
    });

    it('should translate a 23505 unique violation into a ConflictError DUPLICATE', async () => {
      const dupErr = Object.assign(new Error('dup'), { code: '23505' });
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dupErr);

      await expect(
        repo.add(
          { productId: 'prod-uuid', uomId: 'alt-uom-uuid', factorToBase: 1, isActive: true },
          'company-uuid',
        ),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('update', () => {
    it('should update then re-read the row', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [conversionRow], rowCount: 1 }) // getById (pre-check)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ ...conversionRow, factor_to_base: '30000' }], rowCount: 1 }); // getById

      const result = await repo.update('conv-uuid', 'prod-uuid', 'company-uuid', {
        factorToBase: 30000,
      });
      expect(result.factorToBase).toBe(30000);
    });

    it('should throw NotFoundError when the row does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 }); // getById pre-check
      await expect(
        repo.update('x', 'prod-uuid', 'company-uuid', { factorToBase: 1 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('remove', () => {
    it('should delete the row', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await expect(repo.remove('conv-uuid', 'prod-uuid', 'company-uuid')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when nothing was deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.remove('x', 'prod-uuid', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
