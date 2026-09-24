import { JwtService } from '@nestjs/jwt';
import { JwtTokenManager } from '../JwtTokenManager';
import { AuthenticationError } from '../../../Commons/exceptions/AuthenticationError';

// Set env vars for tests
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret';
process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

const jwtService = new JwtService({});

describe('JwtTokenManager', () => {
  let tokenManager: JwtTokenManager;

  beforeEach(() => {
    tokenManager = new JwtTokenManager(jwtService);
  });

  describe('createAccessToken', () => {
    it('should return a JWT string', async () => {
      const token = await tokenManager.createAccessToken({
        sub: 'user-uuid',
        email: 'test@example.com',
        companyId: 'company-uuid',
        isSuperAdmin: false,
        permissions: ['product.read'],
        roleCode: 'KASIR',
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('createRefreshToken', () => {
    it('should return a JWT string', async () => {
      const token = await tokenManager.createRefreshToken({ sub: 'user-uuid' });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should decode and return payload for valid token', async () => {
      const token = await tokenManager.createAccessToken({
        sub: 'user-uuid',
        email: 'test@example.com',
        companyId: null,
        isSuperAdmin: true,
        permissions: [],
        roleCode: null,
      });

      const payload = await tokenManager.verifyAccessToken(token);

      expect(payload.sub).toBe('user-uuid');
      expect(payload.isSuperAdmin).toBe(true);
    });

    it('should throw AuthenticationError for invalid token', async () => {
      await expect(tokenManager.verifyAccessToken('invalid.token.here')).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });

    it('should throw with AUTHENTICATION.TOKEN_NOT_VALID message', async () => {
      await expect(tokenManager.verifyAccessToken('bad')).rejects.toThrow(
        'AUTHENTICATION.TOKEN_NOT_VALID',
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should decode and return payload for valid refresh token', async () => {
      const token = await tokenManager.createRefreshToken({ sub: 'user-uuid' });
      const payload = await tokenManager.verifyRefreshToken(token);

      expect(payload.sub).toBe('user-uuid');
    });

    it('should throw AuthenticationError for invalid refresh token', async () => {
      await expect(tokenManager.verifyRefreshToken('invalid.token')).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });
  });

  describe('getRefreshTokenExpiry', () => {
    it('should return a future Date for 7d expiry', () => {
      process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
      const expiry = tokenManager.getRefreshTokenExpiry();

      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return a future Date for 24h expiry', () => {
      process.env.REFRESH_TOKEN_EXPIRES_IN = '24h';
      const expiry = tokenManager.getRefreshTokenExpiry();

      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return a future Date for 30m expiry', () => {
      process.env.REFRESH_TOKEN_EXPIRES_IN = '30m';
      const expiry = tokenManager.getRefreshTokenExpiry();

      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should default to 7 days for unrecognised format', () => {
      process.env.REFRESH_TOKEN_EXPIRES_IN = 'invalid';
      const expiry = tokenManager.getRefreshTokenExpiry();
      const sevenDaysLater = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);

      expect(expiry.getTime()).toBeGreaterThan(sevenDaysLater.getTime());
    });
  });
});
