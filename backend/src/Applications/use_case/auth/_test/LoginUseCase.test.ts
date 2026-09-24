import { LoginUseCase } from '../LoginUseCase';
import { UserRepository, UserWithPermissions } from '../../../../Domains/users/UserRepository';
import { AuthenticationRepository } from '../../../../Domains/authentications/AuthenticationRepository';
import { PasswordHash } from '../../../security/PasswordHash';
import { TokenManager } from '../../../security/TokenManager';
import { NewAuthentication } from '../../../../Domains/authentications/entities/NewAuthentication';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUserRepository: jest.Mocked<UserRepository> = {
  addUser: jest.fn(),
  verifyAvailableEmail: jest.fn(),
  getPasswordByEmail: jest.fn(),
  getUserWithPermissionsByEmail: jest.fn(),
  getUserWithPermissionsById: jest.fn(),
  getUserById: jest.fn(),
} as unknown as jest.Mocked<UserRepository>;

const mockAuthenticationRepository: jest.Mocked<AuthenticationRepository> = {
  addToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
  deleteExpiredTokens: jest.fn(),
} as unknown as jest.Mocked<AuthenticationRepository>;

const mockPasswordHash: jest.Mocked<PasswordHash> = {
  hash: jest.fn(),
  comparePassword: jest.fn(),
} as unknown as jest.Mocked<PasswordHash>;

const mockTokenManager: jest.Mocked<TokenManager> = {
  createAccessToken: jest.fn(),
  createRefreshToken: jest.fn(),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  decodeRefreshToken: jest.fn(),
  getRefreshTokenExpiry: jest.fn(),
} as unknown as jest.Mocked<TokenManager>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser: UserWithPermissions = {
  id: 'user-uuid',
  companyId: 'company-uuid',
  roleId: 'role-uuid',
  name: 'Budi Santoso',
  email: 'budi@example.com',
  phone: null,
  isSuperAdmin: false,
  isActive: true,
  permissions: ['product.read', 'sales.manage'],
  roleCode: 'OWNER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new LoginUseCase(
      mockUserRepository,
      mockAuthenticationRepository,
      mockPasswordHash,
      mockTokenManager,
    );

    // Default happy-path stubs
    mockUserRepository.getPasswordByEmail.mockResolvedValue('hashed_password');
    mockPasswordHash.comparePassword.mockResolvedValue(undefined);
    mockUserRepository.getUserWithPermissionsByEmail.mockResolvedValue(mockUser);
    mockTokenManager.createAccessToken.mockResolvedValue('access.token');
    mockTokenManager.createRefreshToken.mockResolvedValue('refresh.token');
    mockTokenManager.getRefreshTokenExpiry.mockReturnValue(new Date());
    mockAuthenticationRepository.addToken.mockResolvedValue(undefined);
  });

  it('should return a NewAuthentication with access and refresh token', async () => {
    const result = await useCase.execute({
      email: 'budi@example.com',
      password: 'Secret123',
    });

    expect(result).toBeInstanceOf(NewAuthentication);
    expect(result.accessToken).toBe('access.token');
    expect(result.refreshToken).toBe('refresh.token');
  });

  it('should call getPasswordByEmail with normalised email', async () => {
    await useCase.execute({ email: 'BUDI@EXAMPLE.COM', password: 'Secret123' });

    expect(mockUserRepository.getPasswordByEmail).toHaveBeenCalledWith(
      'budi@example.com',
    );
  });

  it('should call comparePassword with plain and hashed password', async () => {
    await useCase.execute({ email: 'budi@example.com', password: 'Secret123' });

    expect(mockPasswordHash.comparePassword).toHaveBeenCalledWith(
      'Secret123',
      'hashed_password',
    );
  });

  it('should call createAccessToken with correct payload', async () => {
    await useCase.execute({ email: 'budi@example.com', password: 'Secret123' });

    expect(mockTokenManager.createAccessToken).toHaveBeenCalledWith({
      sub: 'user-uuid',
      email: 'budi@example.com',
      companyId: 'company-uuid',
      isSuperAdmin: false,
      permissions: ['product.read', 'sales.manage'],
      roleCode: 'OWNER',
    });
  });

  it('should persist the refresh token', async () => {
    await useCase.execute({ email: 'budi@example.com', password: 'Secret123' });

    expect(mockAuthenticationRepository.addToken).toHaveBeenCalledWith(
      'user-uuid',
      'refresh.token',
      expect.any(Date),
    );
  });

  it('should throw when email is missing', async () => {
    await expect(useCase.execute({ email: '', password: 'pass' })).rejects.toThrow(
      'USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw when password is missing', async () => {
    await expect(
      useCase.execute({ email: 'budi@example.com', password: '' }),
    ).rejects.toThrow('USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should propagate error when comparePassword fails (wrong password)', async () => {
    mockPasswordHash.comparePassword.mockRejectedValue(
      new Error('AUTHENTICATION.CREDENTIALS_NOT_VALID'),
    );

    await expect(
      useCase.execute({ email: 'budi@example.com', password: 'wrong' }),
    ).rejects.toThrow('AUTHENTICATION.CREDENTIALS_NOT_VALID');
  });

  it('should propagate error when user not found', async () => {
    mockUserRepository.getPasswordByEmail.mockRejectedValue(
      new Error('AUTHENTICATION.CREDENTIALS_NOT_VALID'),
    );

    await expect(
      useCase.execute({ email: 'nobody@example.com', password: 'pass' }),
    ).rejects.toThrow('AUTHENTICATION.CREDENTIALS_NOT_VALID');
  });
});
