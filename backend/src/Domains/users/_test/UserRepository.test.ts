import { UserRepository, UserRecord, UserWithPermissions } from '../UserRepository';
import { RegisterUser } from '../entities/RegisterUser';
import { RegisteredUser } from '../entities/RegisteredUser';

describe('UserRepository (abstract contract)', () => {
  class TestUserRepository extends UserRepository {
    async addUser(_data: RegisterUser, _companyId: string | null, _roleId: string | null): Promise<RegisteredUser> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async verifyAvailableEmail(_email: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getPasswordByEmail(_email: string): Promise<string> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getUserWithPermissionsByEmail(_email: string): Promise<UserWithPermissions> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getUserWithPermissionsById(_id: string): Promise<UserWithPermissions> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getUserById(_id: string): Promise<UserRecord> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestUserRepository();
  const mockRegisterUser = new RegisterUser({
    name: 'Test',
    email: 'test@example.com',
    password: 'Secret123',
  });

  it('addUser should throw when not implemented', async () => {
    await expect(repo.addUser(mockRegisterUser, null, null)).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('verifyAvailableEmail should throw when not implemented', async () => {
    await expect(repo.verifyAvailableEmail('test@example.com')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getPasswordByEmail should throw when not implemented', async () => {
    await expect(repo.getPasswordByEmail('test@example.com')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getUserWithPermissionsByEmail should throw when not implemented', async () => {
    await expect(repo.getUserWithPermissionsByEmail('test@example.com')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getUserWithPermissionsById should throw when not implemented', async () => {
    await expect(repo.getUserWithPermissionsById('id')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getUserById should throw when not implemented', async () => {
    await expect(repo.getUserById('id')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
