import { RefreshTokenUseCase } from '../RefreshTokenUseCase';
import { AuthenticationRepository } from '../../../../Domains/authentications/AuthenticationRepository';
import { UserRepository, UserWithPermissions } from '../../../../Domains/users/UserRepository';
import { TokenManager } from '../../../security/TokenManager';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockAuthenticationRepository: jest.Mocked<AuthenticationRepository> = {
  addToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
  deleteExpiredTokens: jest.fn(),
} as unknown as jest.Mocked<AuthenticationRepository>;

const mockUserRepository: jest.Mocked<UserRepository> = {
  addUser: jest.fn(),
  verifyAvailableEmail: jest.fn(),
  getPasswordByEmail: jest.fn(),
  getUserWithPermissionsByEmail: jest.fn(),
  getUserWithPermissionsById: jest.fn(),
  getUserById: jest.fn(),
} as unknown as jest.Mocked<UserRepository>;

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
  name: 'Budi',
  email: 'budi@example.com',
  phone: null,
  isSuperAdmin: false,
  isActive: true,
  permissions: ['product.read'],
  roleCode: 'KASIR',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new RefreshTokenUseCase(
      mockAuthenticationRepository,
      mockUserRepository,
      mockTokenManager,
    );

    // Default happy-path stubs
    mockAuthenticationRepository.verifyRefreshToken.mockResolvedValue(undefined);
    mockTokenManager.verifyRefreshToken.mockResolvedValue({ sub: 'user-uuid' });
    mockUserRepository.getUserWithPermissionsById.mockResolvedValue(mockUser);
    mockTokenManager.createAccessToken.mockResolvedValue('new.access.token');
  });

  it('should return a new access token', async () => {
    const result = await useCase.execute({ refreshToken: 'valid.refresh.token' });

    expect(result).toBe('new.access.token');
  });

  it('should verify the refresh token exists in the store', async () => {
    await useCase.execute({ refreshToken: 'valid.refresh.token' });

    expect(mockAuthenticationRepository.verifyRefreshToken).toHaveBeenCalledWith(
      'valid.refresh.token',
    );
  });

  it('should verify the refresh token signature', async () => {
    await useCase.execute({ refreshToken: 'valid.refresh.token' });

    expect(mockTokenManager.verifyRefreshToken).toHaveBeenCalledWith(
      'valid.refresh.token',
    );
  });

  it('should fetch fresh user + permissions using decoded sub', async () => {
    await useCase.execute({ refreshToken: 'valid.refresh.token' });

    expect(mockUserRepository.getUserWithPermissionsById).toHaveBeenCalledWith(
      'user-uuid',
    );
  });

  it('should create access token with fresh user data', async () => {
    await useCase.execute({ refreshToken: 'valid.refresh.token' });

    expect(mockTokenManager.createAccessToken).toHaveBeenCalledWith({
      sub: 'user-uuid',
      email: 'budi@example.com',
      companyId: 'company-uuid',
      isSuperAdmin: false,
      permissions: ['product.read'],
      roleCode: 'KASIR',
    });
  });

  it('should throw when refreshToken is missing', async () => {
    await expect(useCase.execute({ refreshToken: '' })).rejects.toThrow(
      'REFRESH_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN',
    );
  });

  it('should throw when token is revoked (not in store)', async () => {
    mockAuthenticationRepository.verifyRefreshToken.mockRejectedValue(
      new Error('AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND'),
    );

    await expect(
      useCase.execute({ refreshToken: 'revoked.token' }),
    ).rejects.toThrow('AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND');
  });

  it('should throw when token signature is invalid', async () => {
    mockTokenManager.verifyRefreshToken.mockRejectedValue(
      new Error('AUTHENTICATION.TOKEN_NOT_VALID'),
    );

    await expect(
      useCase.execute({ refreshToken: 'invalid.signature' }),
    ).rejects.toThrow('AUTHENTICATION.TOKEN_NOT_VALID');
  });
});
