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
});
