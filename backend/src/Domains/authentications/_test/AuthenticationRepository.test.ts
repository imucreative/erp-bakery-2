import { AuthenticationRepository } from '../AuthenticationRepository';

describe('AuthenticationRepository (abstract contract)', () => {
  class TestAuthRepo extends AuthenticationRepository {
    async addToken(_userId: string, _refreshToken: string, _expiredAt: Date): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async verifyRefreshToken(_refreshToken: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async deleteRefreshToken(_refreshToken: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async deleteExpiredTokens(): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestAuthRepo();

  it('addToken should throw when not implemented', async () => {
    await expect(repo.addToken('uid', 'token', new Date())).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('verifyRefreshToken should throw when not implemented', async () => {
    await expect(repo.verifyRefreshToken('token')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('deleteRefreshToken should throw when not implemented', async () => {
    await expect(repo.deleteRefreshToken('token')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('deleteExpiredTokens should throw when not implemented', async () => {
    await expect(repo.deleteExpiredTokens()).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
