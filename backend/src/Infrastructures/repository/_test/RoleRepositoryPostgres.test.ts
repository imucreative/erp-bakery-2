import { RoleRepositoryPostgres } from '../RoleRepositoryPostgres';
import { Pool } from 'pg';
import { Role } from '../../../Domains/roles/entities/Role';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const roleRow = {
  id: 'role-uuid',
  company_id: 'company-uuid',
  code: 'KASIR',
  name: 'Kasir',
  description: null,
  is_active: true,
};

describe('RoleRepositoryPostgres', () => {
  let repo: RoleRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new RoleRepositoryPostgres(mockPool);
  });

  describe('getRolesByCompanyId', () => {
    it('should map rows to Role entities', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [roleRow], rowCount: 1 });

      const roles = await repo.getRolesByCompanyId('company-uuid');
      expect(roles).toHaveLength(1);
      expect(roles[0]).toBeInstanceOf(Role);
      expect(roles[0].code).toBe('KASIR');
    });
  });

  describe('getRoleByIdAndCompany', () => {
    it('should return the role when it belongs to the company', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [roleRow], rowCount: 1 });

      const role = await repo.getRoleByIdAndCompany('role-uuid', 'company-uuid');
      expect(role.id).toBe('role-uuid');
    });

    it('should throw NotFoundError when the role is foreign or missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        repo.getRoleByIdAndCompany('role-uuid', 'other-company'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getRolePermissions', () => {
    it('should return permission codes', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ code: 'product.read' }, { code: 'sales.manage' }],
        rowCount: 2,
      });

      const perms = await repo.getRolePermissions('role-uuid');
      expect(perms).toEqual(['product.read', 'sales.manage']);
    });

    it('should return an empty array when the role has no permissions', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      expect(await repo.getRolePermissions('role-uuid')).toEqual([]);
    });
  });
});
