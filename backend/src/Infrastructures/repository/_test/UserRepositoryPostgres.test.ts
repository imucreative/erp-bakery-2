import { UserRepositoryPostgres } from '../UserRepositoryPostgres';
import { Pool } from 'pg';
import { RegisterUser } from '../../../Domains/users/entities/RegisterUser';
import { RegisteredUser } from '../../../Domains/users/entities/RegisteredUser';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';
import { AuthenticationError } from '../../../Commons/exceptions/AuthenticationError';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const mockRegisterUser = new RegisterUser({
  name: 'Budi',
  email: 'budi@example.com',
  password: 'hashed_password',
});

describe('UserRepositoryPostgres', () => {
  let repo: UserRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new UserRepositoryPostgres(mockPool);
  });

  describe('addUser', () => {
    it('should return RegisteredUser on success', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'user-uuid', name: 'Budi', email: 'budi@example.com' }],
        rowCount: 1,
      });

      const result = await repo.addUser(mockRegisterUser, 'company-uuid', 'role-uuid');

      expect(result).toBeInstanceOf(RegisteredUser);
      expect(result.id).toBe('user-uuid');
      expect(result.email).toBe('budi@example.com');
    });
  });

  describe('verifyAvailableEmail', () => {
    it('should resolve when email is available', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.verifyAvailableEmail('new@example.com')).resolves.toBeUndefined();
    });

    it('should throw ConflictError when email is taken', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'uuid' }], rowCount: 1 });

      await expect(repo.verifyAvailableEmail('taken@example.com')).rejects.toBeInstanceOf(
        ConflictError,
      );
    });
  });

  describe('getPasswordByEmail', () => {
    it('should return hashed password when user exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ password: 'hashed' }],
        rowCount: 1,
      });

      const result = await repo.getPasswordByEmail('budi@example.com');
      expect(result).toBe('hashed');
    });

    it('should throw AuthenticationError when user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.getPasswordByEmail('nobody@example.com')).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });
  });

  describe('getUserWithPermissionsByEmail', () => {
    const mockRow = {
      id: 'user-uuid',
      company_id: 'company-uuid',
      role_id: 'role-uuid',
      name: 'Budi',
      email: 'budi@example.com',
      phone: null,
      is_super_admin: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      role_code: 'KASIR',
      permissions: 'product.read,sales.manage',
    };

    it('should return UserWithPermissions with parsed permissions array', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await repo.getUserWithPermissionsByEmail('budi@example.com');

      expect(result.id).toBe('user-uuid');
      expect(result.permissions).toEqual(['product.read', 'sales.manage']);
      expect(result.roleCode).toBe('KASIR');
    });

    it('should return empty permissions array when user has no role', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockRow, permissions: null, role_code: null }],
        rowCount: 1,
      });

      const result = await repo.getUserWithPermissionsByEmail('budi@example.com');
      expect(result.permissions).toEqual([]);
    });

    it('should throw AuthenticationError when user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        repo.getUserWithPermissionsByEmail('nobody@example.com'),
      ).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe('getUserById', () => {
    it('should return UserRecord when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'user-uuid', company_id: null, role_id: null,
          name: 'Budi', email: 'budi@example.com', phone: null,
          is_super_admin: false, is_active: true,
          created_at: new Date(), updated_at: new Date(),
        }],
        rowCount: 1,
      });

      const result = await repo.getUserById('user-uuid');
      expect(result.id).toBe('user-uuid');
    });

    it('should throw NotFoundError when user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.getUserById('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getUsersByCompany', () => {
    const row = {
      id: 'user-uuid', company_id: 'company-uuid', role_id: 'role-uuid',
      name: 'Kasir', email: 'kasir@a.test', phone: null,
      is_super_admin: false, is_active: true,
      created_at: new Date(), updated_at: new Date(),
    };

    it('should return rows and total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.getUsersByCompany('company-uuid', { limit: 10, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.rows[0].email).toBe('kasir@a.test');
    });

    it('should apply search, roleId and isActive filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getUsersByCompany('company-uuid', {
        limit: 10, offset: 0, search: 'kas', roleId: 'role-uuid', isActive: true,
      });

      const countSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('role_id');
      expect(countSql).toContain('is_active');
    });
  });

  describe('getUserDetail', () => {
    it('should return user with role and outlets', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-uuid', company_id: 'company-uuid', role_id: 'role-uuid',
            name: 'Kasir', email: 'kasir@a.test', phone: null,
            is_super_admin: false, is_active: true,
            created_at: new Date(), updated_at: new Date(),
            role_code: 'KASIR', role_name: 'Kasir',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ outlet_id: 'o1', code: 'OUT-001', name: 'Outlet A', is_active: true }],
          rowCount: 1,
        });

      const result = await repo.getUserDetail('user-uuid', 'company-uuid');
      expect(result.roleCode).toBe('KASIR');
      expect(result.outlets).toHaveLength(1);
      expect(result.outlets[0].code).toBe('OUT-001');
    });

    it('should throw NotFoundError when user is not in the company', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.getUserDetail('x', 'company-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateUser', () => {
    const row = {
      id: 'user-uuid', company_id: 'company-uuid', role_id: 'role-uuid',
      name: 'Renamed', email: 'kasir@a.test', phone: null,
      is_super_admin: false, is_active: true,
      created_at: new Date(), updated_at: new Date(),
    };

    it('should update and return the record when fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [row], rowCount: 1 });

      const result = await repo.updateUser('user-uuid', 'company-uuid', { name: 'Renamed' });
      expect(result.name).toBe('Renamed');
    });

    it('should return current record when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [row], rowCount: 1 });

      const result = await repo.updateUser('user-uuid', 'company-uuid', {});
      expect(result.id).toBe('user-uuid');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        repo.updateUser('x', 'company-uuid', { name: 'Y' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('softDeleteUser', () => {
    it('should resolve when a row is updated', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await expect(repo.softDeleteUser('user-uuid', 'company-uuid')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      await expect(repo.softDeleteUser('x', 'company-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('setUserOutlets', () => {
    it('should delete all assignments when list is empty', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      await repo.setUserOutlets('user-uuid', []);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect((mockPool.query as jest.Mock).mock.calls[0][0]).toContain('DELETE FROM user_outlets');
    });

    it('should prune then upsert when outlets are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await repo.setUserOutlets('user-uuid', ['o1', 'o2']);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect((mockPool.query as jest.Mock).mock.calls[1][0]).toContain('ON CONFLICT');
    });
  });
});
