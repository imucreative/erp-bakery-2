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

  /**
   * Delete every active refresh token of a user.
   * Dipakai setelah reset password supaya seluruh sesi lama (termasuk milik
   * penyerang yang mungkin memegang token) langsung tidak berlaku lagi.
   */
  abstract deleteTokensByUserId(userId: string): Promise<void>;

  /**
   * Delete every refresh token of a user EXCEPT one (biasanya sesi yang sedang
   * dipakai). Dipakai saat ganti password: sesi lain dicabut, sesi aktif tetap
   * hidup sehingga pengguna tidak terlempar keluar.
   */
  abstract deleteTokensByUserIdExcept(userId: string, keepRefreshToken: string): Promise<void>;
}
