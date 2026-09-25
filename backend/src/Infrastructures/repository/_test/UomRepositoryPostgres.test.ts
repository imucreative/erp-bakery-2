import { UomRepositoryPostgres } from '../UomRepositoryPostgres';
import { Pool } from 'pg';
import { Uom } from '../../../Domains/uoms/entities/Uom';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const uomRow = {
  id: 'uom-uuid',
  company_id: 'company-uuid',
  code: 'UOM-001',
  name: 'PCS',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('UomRepositoryPostgres', () => {
  let repo: UomRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new UomRepositoryPostgres(mockPool);
  });

  describe('addUom', () => {
    it('should return a Uom on success', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [uomRow], rowCount: 1 });
      const result = await repo.addUom({ code: 'UOM-001', name: 'PCS' }, 'company-uuid');
      expect(result).toBeInstanceOf(Uom);
      expect(result.code).toBe('UOM-001');
    });
  });

  describe('generateUomCode', () => {
    it('should generate UOM-001 when none exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });
      expect(await repo.generateUomCode('company-uuid')).toBe('UOM-001');
    });

    it('should pad to 3 digits', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '12' }] });
      expect(await repo.generateUomCode('company-uuid')).toBe('UOM-013');
    });
  });

  describe('getUomsByCompany', () => {
    it('should return rows and total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [uomRow], rowCount: 1 });

      const result = await repo.getUomsByCompany('company-uuid', { limit: 10, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.rows).toHaveLength(1);
    });

    it('should apply search and isActive filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [uomRow], rowCount: 1 });

      await repo.getUomsByCompany('company-uuid', {
        limit: 10,
        offset: 0,
        search: 'PC',
        isActive: true,
      });

      const countSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('is_active');
    });
  });

  describe('getUomById', () => {
    it('should return a Uom when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [uomRow], rowCount: 1 });
      const result = await repo.getUomById('uom-uuid', 'company-uuid');
      expect(result.id).toBe('uom-uuid');
    });

    it('should throw NotFoundError when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getUomById('x', 'company-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateUom', () => {
    it('should return the updated Uom when fields are provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [uomRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...uomRow, name: 'KG' }], rowCount: 1 });

      const result = await repo.updateUom('uom-uuid', 'company-uuid', { name: 'KG' });
      expect(result.name).toBe('KG');
    });

    it('should return current state when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [uomRow], rowCount: 1 });
      const result = await repo.updateUom('uom-uuid', 'company-uuid', {});
      expect(result.id).toBe('uom-uuid');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDeleteUom', () => {
    it('should resolve when a row is updated', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await expect(repo.softDeleteUom('uom-uuid', 'company-uuid')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.softDeleteUom('x', 'company-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('countActiveDependents', () => {
    it('should return the dependent product count', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '4' }] });
      expect(await repo.countActiveDependents('uom-uuid', 'company-uuid')).toBe(4);
    });

    it('should query the products table', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });
      await repo.countActiveDependents('uom-uuid', 'company-uuid');
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('products');
      expect(sql).toContain('uom_id');
    });
  });
});
