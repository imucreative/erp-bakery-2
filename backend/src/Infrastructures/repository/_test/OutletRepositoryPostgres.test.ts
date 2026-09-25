import { OutletRepositoryPostgres } from '../OutletRepositoryPostgres';
import { Pool } from 'pg';
import { Outlet } from '../../../Domains/outlets/entities/Outlet';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const outletRow = {
  id: 'outlet-uuid',
  company_id: 'company-uuid',
  code: 'OUT-001',
  name: 'Outlet A',
  address: null,
  phone: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('OutletRepositoryPostgres', () => {
  let repo: OutletRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new OutletRepositoryPostgres(mockPool);
  });

  describe('addOutlet', () => {
    it('should return an Outlet on success', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [outletRow], rowCount: 1 });

      const result = await repo.addOutlet(
        { code: 'OUT-001', name: 'Outlet A', address: null, phone: null },
        'company-uuid',
      );

      expect(result).toBeInstanceOf(Outlet);
      expect(result.code).toBe('OUT-001');
    });
  });

  describe('generateOutletCode', () => {
    it('should generate OUT-001 when no outlets exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });

      expect(await repo.generateOutletCode('company-uuid')).toBe('OUT-001');
    });

    it('should pad to 3 digits', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '9' }] });

      expect(await repo.generateOutletCode('company-uuid')).toBe('OUT-010');
    });
  });

  describe('getOutletsByCompany', () => {
    it('should return rows and total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [outletRow, outletRow], rowCount: 2 });

      const result = await repo.getOutletsByCompany('company-uuid', {
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(2);
      expect(result.rows).toHaveLength(2);
    });

    it('should apply search and isActive filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [outletRow], rowCount: 1 });

      await repo.getOutletsByCompany('company-uuid', {
        limit: 10,
        offset: 0,
        search: 'A',
        isActive: true,
      });

      const countSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('is_active');
    });
  });

  describe('getOutletById', () => {
    it('should return an Outlet when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [outletRow], rowCount: 1 });

      const result = await repo.getOutletById('outlet-uuid', 'company-uuid');
      expect(result.id).toBe('outlet-uuid');
    });

    it('should throw NotFoundError when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.getOutletById('x', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('updateOutlet', () => {
    it('should return the updated Outlet when fields are provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [outletRow], rowCount: 1 }) // existence check
        .mockResolvedValueOnce({ rows: [{ ...outletRow, name: 'Renamed' }], rowCount: 1 });

      const result = await repo.updateOutlet('outlet-uuid', 'company-uuid', {
        name: 'Renamed',
      });

      expect(result.name).toBe('Renamed');
    });

    it('should return current state when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [outletRow], rowCount: 1 });

      const result = await repo.updateOutlet('outlet-uuid', 'company-uuid', {});

      expect(result.id).toBe('outlet-uuid');
      expect(mockPool.query).toHaveBeenCalledTimes(1); // only the existence check
    });
  });

  describe('softDeleteOutlet', () => {
    it('should resolve when a row is updated', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await expect(
        repo.softDeleteOutlet('outlet-uuid', 'company-uuid'),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      await expect(repo.softDeleteOutlet('x', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('verifyOutletsBelongToCompany', () => {
    it('should resolve when all outlets belong to the company', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '2' }] });

      await expect(
        repo.verifyOutletsBelongToCompany('company-uuid', ['o1', 'o2']),
      ).resolves.toBeUndefined();
    });

    it('should resolve immediately for an empty list', async () => {
      await expect(
        repo.verifyOutletsBelongToCompany('company-uuid', []),
      ).resolves.toBeUndefined();
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when an outlet is missing or foreign', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '1' }] });

      await expect(
        repo.verifyOutletsBelongToCompany('company-uuid', ['o1', 'o2']),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
