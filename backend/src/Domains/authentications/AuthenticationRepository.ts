/**
 * Abstract repository interface — Authentications domain.
 * Manages active refresh token store (mirrors sample-be pattern).
 */
export abstract class AuthenticationRepository {
  /**
   * Persist a new refresh token record.
   */
  abstract addToken(
    userId: string,
    refreshToken: string,
    expiredAt: Date,
  ): Promise<void>;

  /**
   * Verify the token exists in the store.
   * Throws AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND if missing.
   */
  abstract verifyRefreshToken(refreshToken: string): Promise<void>;

  /**
   * Delete the refresh token (logout / rotate).
   * Throws AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND if missing.
   */
  abstract deleteRefreshToken(refreshToken: string): Promise<void>;

  /**
   * Remove all expired tokens (cleanup job).
   */
  abstract deleteExpiredTokens(): Promise<void>;
}
