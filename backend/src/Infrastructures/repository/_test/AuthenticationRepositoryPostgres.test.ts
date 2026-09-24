import { AuthenticationRepositoryPostgres } from '../AuthenticationRepositoryPostgres';
import { Pool } from 'pg';
import { AuthenticationError } from '../../../Commons/exceptions/AuthenticationError';

const mockPool = { query: jest.fn() } as unknown as Pool;

describe('AuthenticationRepositoryPostgres', () => {
  let repo: AuthenticationRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new AuthenticationRepositoryPostgres(mockPool);
  });

  describe('addToken', () => {
    it('should insert refresh token without throwing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await expect(
        repo.addToken('user-uuid', 'refresh.token', new Date()),
      ).resolves.toBeUndefined();

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should resolve when token exists and is not expired', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'uuid' }], rowCount: 1 });

      await expect(repo.verifyRefreshToken('valid.token')).resolves.toBeUndefined();
    });

    it('should throw AuthenticationError when token not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.verifyRefreshToken('unknown')).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });

    it('should throw with AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND message', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.verifyRefreshToken('unknown')).rejects.toThrow(
        'AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND',
      );
    });
  });

  describe('deleteRefreshToken', () => {
    it('should resolve when token is deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await expect(repo.deleteRefreshToken('valid.token')).resolves.toBeUndefined();
    });

    it('should throw AuthenticationError when token not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      await expect(repo.deleteRefreshToken('unknown')).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });
  });

  describe('deleteExpiredTokens', () => {
    it('should execute delete without throwing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 3 });

      await expect(repo.deleteExpiredTokens()).resolves.toBeUndefined();
    });
  });
});
