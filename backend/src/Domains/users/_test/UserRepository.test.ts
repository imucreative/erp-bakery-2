import {
  UserRepository,
  UserRecord,
  UserWithPermissions,
  UserListFilter,
  UserDetail,
  UpdateUserFields,
  TwoFactorState,
  MyProfile,
  UpdateMyProfileFields,
  PasswordResetToken,
  PasswordResetUser,
} from '../UserRepository';
import { RegisterUser } from '../entities/RegisterUser';
import { RegisteredUser } from '../entities/RegisteredUser';

describe('UserRepository (abstract contract)', () => {
  class TestUserRepository extends UserRepository {
    async addUser(
      _data: RegisterUser,
      _companyId: string | null,
      _roleId: string | null,
    ): Promise<RegisteredUser> {
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
    async getUsersByCompany(
      _companyId: string,
      _filter: UserListFilter,
    ): Promise<{ rows: UserRecord[]; total: number }> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getUserDetail(_id: string, _companyId: string): Promise<UserDetail> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateUser(
      _id: string,
      _companyId: string,
      _fields: UpdateUserFields,
    ): Promise<UserRecord> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async softDeleteUser(_id: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async setUserOutlets(_userId: string, _outletIds: string[]): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getTwoFactorStateByEmail(_email: string): Promise<TwoFactorState> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getTwoFactorStateById(_id: string): Promise<TwoFactorState> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async saveTwoFactorSetup(
      _id: string,
      _secretCipher: string,
      _recoveryCodeHashes: string[],
    ): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateRecoveryCodes(_id: string, _recoveryCodeHashes: string[]): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async setTwoFactorEnabled(_id: string, _enabled: boolean): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getMyProfile(_id: string): Promise<MyProfile> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateMyProfile(_id: string, _fields: UpdateMyProfileFields): Promise<MyProfile> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async touchLastLogin(_id: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async findActiveUserByEmail(_email: string): Promise<PasswordResetUser | null> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async createPasswordResetToken(
      _userId: string,
      _tokenHash: string,
      _expiresAt: Date,
      _requestedIp: string | null,
    ): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getUsablePasswordResetToken(_tokenHash: string): Promise<PasswordResetToken | null> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async markPasswordResetTokenUsed(_id: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updatePassword(_id: string, _passwordHash: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getPasswordById(_id: string): Promise<string> {
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
