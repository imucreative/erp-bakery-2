import { LoginUseCase } from '../LoginUseCase';
import { UserRepository, UserWithPermissions } from '../../../../Domains/users/UserRepository';
import { AuthenticationRepository } from '../../../../Domains/authentications/AuthenticationRepository';
import { PasswordHash } from '../../../security/PasswordHash';
import { TokenManager } from '../../../security/TokenManager';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUserRepository: jest.Mocked<UserRepository> = {
  addUser: jest.fn(),
  verifyAvailableEmail: jest.fn(),
  getPasswordByEmail: jest.fn(),
  getUserWithPermissionsByEmail: jest.fn(),
  getUserWithPermissionsById: jest.fn(),
  getUserById: jest.fn(),
  getTwoFactorStateByEmail: jest.fn(),
  getTwoFactorStateById: jest.fn(),
  saveTwoFactorSetup: jest.fn(),
  updateRecoveryCodes: jest.fn(),
  setTwoFactorEnabled: jest.fn(),
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
  touchLastLogin: jest.fn(),
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
  createMfaToken: jest.fn(),
  verifyMfaToken: jest.fn(),
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
    mockUserRepository.getTwoFactorStateByEmail.mockResolvedValue({
      id: 'user-uuid',
      email: 'budi@example.com',
      isSuperAdmin: false,
      enabled: false,
      secretCipher: null,
      recoveryCodeHashes: [],
    });
  });

  it('should return tokens when 2FA is not enabled', async () => {
    const result = await useCase.execute({
      email: 'budi@example.com',
      password: 'Secret123',
    });

    expect(result).toEqual({
      mfaRequired: false,
      accessToken: 'access.token',
      refreshToken: 'refresh.token',
    });
  });

  it('should return an MFA challenge (no tokens) when 2FA is enabled', async () => {
    mockUserRepository.getTwoFactorStateByEmail.mockResolvedValue({
      id: 'user-uuid',
      email: 'budi@example.com',
      isSuperAdmin: false,
      enabled: true,
      secretCipher: 'encrypted-secret',
      recoveryCodeHashes: [],
    });
    mockTokenManager.createMfaToken.mockResolvedValue('mfa.token');

    const result = await useCase.execute({
      email: 'budi@example.com',
      password: 'Secret123',
    });

    expect(result).toEqual({ mfaRequired: true, mfaToken: 'mfa.token' });
    expect(mockTokenManager.createAccessToken).not.toHaveBeenCalled();
    expect(mockAuthenticationRepository.addToken).not.toHaveBeenCalled();
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

  it('should issue a longer refresh token when rememberMe is true', async () => {
    process.env.REFRESH_TOKEN_REMEMBER_EXPIRES_IN = '30d';

    await useCase.execute({
      email: 'budi@example.com',
      password: 'Secret123',
      rememberMe: true,
    });

    expect(mockTokenManager.createRefreshToken).toHaveBeenCalledWith(
      { sub: 'user-uuid' },
      '30d',
    );
    expect(mockTokenManager.getRefreshTokenExpiry).toHaveBeenCalledWith('30d');
  });

  it('should use the default refresh TTL (no override) when rememberMe is absent', async () => {
    await useCase.execute({ email: 'budi@example.com', password: 'Secret123' });

    expect(mockTokenManager.createRefreshToken).toHaveBeenCalledWith(
      { sub: 'user-uuid' },
      undefined,
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
