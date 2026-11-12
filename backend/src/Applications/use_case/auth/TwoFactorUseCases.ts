import { randomInt } from 'crypto';
import { UserRepository } from '../../../Domains/users/UserRepository';
import { AuthenticationRepository } from '../../../Domains/authentications/AuthenticationRepository';
import { PasswordHash } from '../../security/PasswordHash';
import { SecretCipher } from '../../security/SecretCipher';
import { TokenManager } from '../../security/TokenManager';
import { Totp } from '../../security/Totp';
import { NewAuthentication } from '../../../Domains/authentications/entities/NewAuthentication';
import { AuthenticationError } from '../../../Commons/exceptions/AuthenticationError';
import { refreshTokenTtlFor } from './sessionTtl';

const ISSUER = process.env.TWO_FACTOR_ISSUER ?? 'Bakery ERP';
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i += 1) {
    let raw = '';
    for (let j = 0; j < 10; j += 1) {
      raw += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
    }
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

/**
 * UseCase: SetupTwoFactorUseCase
 *
 * Starts TOTP enrollment: generates a secret + one-time recovery codes,
 * persists them (secret encrypted, codes hashed) but does NOT enable 2FA yet.
 * The caller must confirm with a valid code via EnableTwoFactorUseCase.
 */
export class SetupTwoFactorUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHash: PasswordHash,
    private readonly secretCipher: SecretCipher,
    private readonly totp: Totp,
  ) {}

  async execute(
    userId: string,
  ): Promise<{ secret: string; otpauthUri: string; recoveryCodes: string[] }> {
    const user = await this.userRepository.getUserById(userId);
    const secret = this.totp.generateSecret();
    const recoveryCodes = generateRecoveryCodes();

    const hashes: string[] = [];
    for (const code of recoveryCodes) {
      hashes.push(await this.passwordHash.hash(code));
    }

    await this.userRepository.saveTwoFactorSetup(
      userId,
      this.secretCipher.encrypt(secret),
      hashes,
    );

    return {
      secret,
      otpauthUri: this.totp.buildOtpAuthUri(secret, user.email, ISSUER),
      recoveryCodes,
    };
  }
}

/**
 * UseCase: EnableTwoFactorUseCase
 *
 * Confirms enrollment: verifies a TOTP code against the pending secret and
 * flips the 2FA switch on. Next login becomes two-step.
 */
export class EnableTwoFactorUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly secretCipher: SecretCipher,
    private readonly totp: Totp,
  ) {}

  async execute(userId: string, code: string): Promise<void> {
    const state = await this.userRepository.getTwoFactorStateById(userId);
    if (!state.secretCipher) {
      throw new AuthenticationError('AUTHENTICATION.MFA_SETUP_REQUIRED');
    }

    const secret = this.secretCipher.decrypt(state.secretCipher);
    if (!this.totp.verify(secret, code)) {
      throw new AuthenticationError('AUTHENTICATION.MFA_CODE_INVALID');
    }

    await this.userRepository.setTwoFactorEnabled(userId, true);
  }
}

/**
 * UseCase: DisableTwoFactorUseCase
 *
 * Turns 2FA off (and clears the secret + recovery codes). Requires a valid
 * current TOTP code so a hijacked session cannot silently disable it.
 */
export class DisableTwoFactorUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly secretCipher: SecretCipher,
    private readonly totp: Totp,
  ) {}

  async execute(userId: string, code: string): Promise<void> {
    const state = await this.userRepository.getTwoFactorStateById(userId);
    if (!state.enabled || !state.secretCipher) {
      throw new AuthenticationError('AUTHENTICATION.MFA_NOT_ENABLED');
    }

    const secret = this.secretCipher.decrypt(state.secretCipher);
    if (!this.totp.verify(secret, code)) {
      throw new AuthenticationError('AUTHENTICATION.MFA_CODE_INVALID');
    }

    await this.userRepository.setTwoFactorEnabled(userId, false);
  }
}

/**
 * UseCase: VerifyTwoFactorLoginUseCase
 *
 * Second login step. Exchanges a short-lived MFA token + a TOTP code (or a
 * single-use recovery code) for the normal access/refresh token pair.
 */
export class VerifyTwoFactorLoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly passwordHash: PasswordHash,
    private readonly secretCipher: SecretCipher,
    private readonly totp: Totp,
    private readonly tokenManager: TokenManager,
  ) {}

  async execute(payload: {
    mfaToken: string;
    code: string;
    rememberMe?: boolean;
  }): Promise<NewAuthentication> {
    const { sub } = await this.tokenManager.verifyMfaToken(payload.mfaToken);
    const state = await this.userRepository.getTwoFactorStateById(sub);
    if (!state.enabled || !state.secretCipher) {
      throw new AuthenticationError('AUTHENTICATION.MFA_NOT_ENABLED');
    }

    const code = (payload.code ?? '').trim();
    const verified = await this.verifyCode(sub, state.secretCipher, state.recoveryCodeHashes, code);
    if (!verified) {
      throw new AuthenticationError('AUTHENTICATION.MFA_CODE_INVALID');
    }

    const user = await this.userRepository.getUserWithPermissionsById(sub);

    const accessToken = await this.tokenManager.createAccessToken({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions,
      roleCode: user.roleCode,
    });

    const refreshTtl = refreshTokenTtlFor(payload.rememberMe === true);
    const refreshToken = await this.tokenManager.createRefreshToken(
      { sub: user.id },
      refreshTtl,
    );
    const expiredAt = this.tokenManager.getRefreshTokenExpiry(refreshTtl);
    await this.authenticationRepository.addToken(user.id, refreshToken, expiredAt);

    return new NewAuthentication({ accessToken, refreshToken });
  }

  /** TOTP code first; otherwise consume one matching recovery code. */
  private async verifyCode(
    userId: string,
    secretCipher: string,
    recoveryCodeHashes: string[],
    code: string,
  ): Promise<boolean> {
    if (/^\d{6}$/.test(code)) {
      const secret = this.secretCipher.decrypt(secretCipher);
      return this.totp.verify(secret, code);
    }

    for (const hash of recoveryCodeHashes) {
      if (await this.matchesHash(code, hash)) {
        await this.userRepository.updateRecoveryCodes(
          userId,
          recoveryCodeHashes.filter((candidate) => candidate !== hash),
        );
        return true;
      }
    }

    return false;
  }

  private async matchesHash(code: string, hash: string): Promise<boolean> {
    try {
      await this.passwordHash.comparePassword(code, hash);
      return true;
    } catch {
      return false;
    }
  }
}
