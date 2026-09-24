import { LogoutUseCase } from '../LogoutUseCase';
import { AuthenticationRepository } from '../../../../Domains/authentications/AuthenticationRepository';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockAuthenticationRepository: jest.Mocked<AuthenticationRepository> = {
  addToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
  deleteExpiredTokens: jest.fn(),
} as unknown as jest.Mocked<AuthenticationRepository>;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new LogoutUseCase(mockAuthenticationRepository);

    // Default happy-path stubs
    mockAuthenticationRepository.verifyRefreshToken.mockResolvedValue(undefined);
    mockAuthenticationRepository.deleteRefreshToken.mockResolvedValue(undefined);
  });

  it('should verify and delete the refresh token', async () => {
    await useCase.execute({ refreshToken: 'valid.refresh.token' });

    expect(mockAuthenticationRepository.verifyRefreshToken).toHaveBeenCalledWith(
      'valid.refresh.token',
    );
    expect(mockAuthenticationRepository.deleteRefreshToken).toHaveBeenCalledWith(
      'valid.refresh.token',
    );
  });

  it('should resolve successfully on valid token', async () => {
    await expect(
      useCase.execute({ refreshToken: 'valid.refresh.token' }),
    ).resolves.toBeUndefined();
  });

  it('should throw when refreshToken is missing', async () => {
    await expect(useCase.execute({ refreshToken: '' })).rejects.toThrow(
      'DELETE_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN',
    );
  });

  it('should throw when refreshToken is not a string', async () => {
    await expect(useCase.execute({ refreshToken: 123 })).rejects.toThrow(
      'DELETE_AUTHENTICATION.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw when token is not found in store', async () => {
    mockAuthenticationRepository.verifyRefreshToken.mockRejectedValue(
      new Error('AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND'),
    );

    await expect(
      useCase.execute({ refreshToken: 'unknown.token' }),
    ).rejects.toThrow('AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND');
  });

  it('should not call deleteRefreshToken if verifyRefreshToken throws', async () => {
    mockAuthenticationRepository.verifyRefreshToken.mockRejectedValue(
      new Error('AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND'),
    );

    await useCase.execute({ refreshToken: 'unknown.token' }).catch(() => {});

    expect(mockAuthenticationRepository.deleteRefreshToken).not.toHaveBeenCalled();
  });
});
