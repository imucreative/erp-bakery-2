import { UserLogin } from '../../../Domains/users/entities/UserLogin';
import { UserRepository } from '../../../Domains/users/UserRepository';
import { AuthenticationRepository } from '../../../Domains/authentications/AuthenticationRepository';
import { PasswordHash } from '../../security/PasswordHash';
import { TokenManager } from '../../security/TokenManager';
import { refreshTokenTtlFor } from './sessionTtl';

/**
 * Result of the first login step.
 * When the account has 2FA enabled, NO tokens are issued — the caller must
 * exchange `mfaToken` + a TOTP/recovery code via the MFA verify endpoint.
 */
export type LoginResult =
  | { mfaRequired: true; mfaToken: string }
  | { mfaRequired: false; accessToken: string; refreshToken: string };

/**
 * UseCase: LoginUseCase
 *
 * 1. Validate login credentials (domain entity)
 * 2. Fetch hashed password by email
 * 3. Compare passwords
 * 4. Fetch user + permissions
 * 5. If 2FA is enabled → return a short-lived MFA challenge instead of tokens
 * 6. Issue access token + refresh token
 * 7. Persist refresh token
 * 8. Return token pair
 */
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly passwordHash: PasswordHash,
    private readonly tokenManager: TokenManager,
  ) {}

  async execute(payload: unknown): Promise<LoginResult> {
    // Step 1 — validate
    const { email, password } = new UserLogin(payload);
    const rememberMe = (payload as { rememberMe?: unknown }).rememberMe === true;

    // Step 2 — get hashed password
    const hashedPassword = await this.userRepository.getPasswordByEmail(email);

    // Step 3 — compare
    await this.passwordHash.comparePassword(password, hashedPassword);

    // Step 4 — fetch user + permissions
    const user = await this.userRepository.getUserWithPermissionsByEmail(email);

    // Step 5 — 2FA gate
    const twoFactor = await this.userRepository.getTwoFactorStateByEmail(email);
    if (twoFactor.enabled) {
      const mfaToken = await this.tokenManager.createMfaToken({ sub: user.id });
      return { mfaRequired: true, mfaToken };
    }

    // Step 6 — issue tokens
    const accessToken = await this.tokenManager.createAccessToken({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions,
      roleCode: user.roleCode,
    });

    const refreshTtl = refreshTokenTtlFor(rememberMe);
    const refreshToken = await this.tokenManager.createRefreshToken(
      { sub: user.id },
      refreshTtl,
    );

    // Step 7 — persist refresh token
    const expiredAt = this.tokenManager.getRefreshTokenExpiry(refreshTtl);
    await this.authenticationRepository.addToken(user.id, refreshToken, expiredAt);

    // Step 8 — record the successful login (best-effort, never blocks login)
    try {
      await this.userRepository.touchLastLogin(user.id);
    } catch {
      // Non-critical: the profile simply shows the previous login time.
    }

    // Step 9 — return
    return { mfaRequired: false, accessToken, refreshToken };
  }
}
