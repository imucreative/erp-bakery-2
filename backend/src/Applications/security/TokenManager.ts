/**
 * Abstract security interface: TokenManager
 * Concrete implementation: JwtTokenManager (Infrastructures/security/)
 */
export interface JwtAccessPayload {
  sub: string;          // user id
  email: string;
  companyId: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  roleCode: string | null;
}

export interface JwtRefreshPayload {
  sub: string; // user id
}

export abstract class TokenManager {
  /**
   * Create a signed access token (short-lived).
   */
  abstract createAccessToken(payload: JwtAccessPayload): Promise<string>;

  /**
   * Create a signed refresh token (long-lived).
   */
  abstract createRefreshToken(payload: JwtRefreshPayload): Promise<string>;

  /**
   * Verify and decode an access token.
   * Throws AUTHENTICATION.TOKEN_NOT_VALID if invalid/expired.
   */
  abstract verifyAccessToken(token: string): Promise<JwtAccessPayload>;

  /**
   * Verify and decode a refresh token.
   * Throws AUTHENTICATION.TOKEN_NOT_VALID if invalid/expired.
   */
  abstract verifyRefreshToken(token: string): Promise<JwtRefreshPayload>;

  /**
   * Decode without verifying expiry (used for refresh flow).
   */
  abstract decodeRefreshToken(token: string): Promise<JwtRefreshPayload>;

  /**
   * Calculate expiry Date from refresh token expiry env var.
   */
  abstract getRefreshTokenExpiry(): Date;
}
