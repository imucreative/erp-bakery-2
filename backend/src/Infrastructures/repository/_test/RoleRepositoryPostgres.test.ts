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

  describe('updateRole', () => {
    it('should update editable fields scoped to the company and return the role', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...roleRow, name: 'Kasir Utama' }],
        rowCount: 1,
      });

      const role = await repo.updateRole('role-uuid', 'company-uuid', { name: 'Kasir Utama' });

      expect(role.name).toBe('Kasir Utama');
      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('UPDATE roles');
      expect(sql).toContain('company_id =');
      expect(params).toContain('role-uuid');
      expect(params).toContain('company-uuid');
    });

    it('should throw NotFoundError when the role is foreign, platform, or missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        repo.updateRole('role-uuid', 'other-company', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('setRolePermissions', () => {
    it('should delete existing then insert resolved permissions in a transaction', async () => {
      const client = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(undefined) // DELETE
          .mockResolvedValueOnce({ rows: [{ id: 'p1' }, { id: 'p2' }] }) // SELECT ids
          .mockResolvedValueOnce(undefined) // INSERT
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn(),
      };
      (mockPool as unknown as { connect: jest.Mock }).connect = jest
        .fn()
        .mockResolvedValue(client);

      await repo.setRolePermissions('role-uuid', ['sales.manage', 'shift.manage']);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM role_permissions'),
        ['role-uuid'],
      );
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('should only delete when the new set is empty', async () => {
      const client = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(undefined) // DELETE
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn(),
      };
      (mockPool as unknown as { connect: jest.Mock }).connect = jest
        .fn()
        .mockResolvedValue(client);

      await repo.setRolePermissions('role-uuid', []);

      expect(client.query).toHaveBeenCalledWith('COMMIT');
      // No INSERT was issued
      const insertCall = client.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT'),
      );
      expect(insertCall).toBeUndefined();
    });

    it('should rollback and rethrow on failure', async () => {
      const client = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockRejectedValueOnce(new Error('boom')) // DELETE fails
          .mockResolvedValueOnce(undefined), // ROLLBACK
        release: jest.fn(),
      };
      (mockPool as unknown as { connect: jest.Mock }).connect = jest
        .fn()
        .mockResolvedValue(client);

      await expect(repo.setRolePermissions('role-uuid', ['sales.manage'])).rejects.toThrow('boom');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('deleteRole', () => {
    it('should delete a company-owned role', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await expect(repo.deleteRole('role-uuid', 'company-uuid')).resolves.toBeUndefined();
      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('DELETE FROM roles');
      expect(params).toEqual(['role-uuid', 'company-uuid']);
    });

    it('should throw NotFoundError when nothing was deleted (foreign/platform/missing)', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      await expect(repo.deleteRole('role-uuid', 'other-company')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('countUsersUsingRole', () => {
    it('should return the active user count for the role', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: 4 }], rowCount: 1 });

      const count = await repo.countUsersUsingRole('role-uuid', 'company-uuid');
      expect(count).toBe(4);
      const [sql] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('deleted_at IS NULL');
    });

    it('should return 0 when no rows come back', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      expect(await repo.countUsersUsingRole('role-uuid', 'company-uuid')).toBe(0);
    });
  });
});
