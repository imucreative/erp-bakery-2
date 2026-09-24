import { UserLogin } from '../../../Domains/users/entities/UserLogin';
import { NewAuthentication } from '../../../Domains/authentications/entities/NewAuthentication';
import { UserRepository } from '../../../Domains/users/UserRepository';
import { AuthenticationRepository } from '../../../Domains/authentications/AuthenticationRepository';
import { PasswordHash } from '../../security/PasswordHash';
import { TokenManager } from '../../security/TokenManager';

/**
 * UseCase: LoginUseCase
 *
 * 1. Validate login credentials (domain entity)
 * 2. Fetch hashed password by email
 * 3. Compare passwords
 * 4. Fetch user + permissions
 * 5. Issue access token + refresh token
 * 6. Persist refresh token
 * 7. Return token pair
 */
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly passwordHash: PasswordHash,
    private readonly tokenManager: TokenManager,
  ) {}

  async execute(payload: unknown): Promise<NewAuthentication> {
    // Step 1 — validate
    const { email, password } = new UserLogin(payload);

    // Step 2 — get hashed password
    const hashedPassword = await this.userRepository.getPasswordByEmail(email);

    // Step 3 — compare
    await this.passwordHash.comparePassword(password, hashedPassword);

    // Step 4 — fetch user + permissions
    const user = await this.userRepository.getUserWithPermissionsByEmail(email);

    // Step 5 — issue tokens
    const accessToken = await this.tokenManager.createAccessToken({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions,
      roleCode: user.roleCode,
    });

    const refreshToken = await this.tokenManager.createRefreshToken({
      sub: user.id,
    });

    // Step 6 — persist refresh token
    const expiredAt = this.tokenManager.getRefreshTokenExpiry();
    await this.authenticationRepository.addToken(user.id, refreshToken, expiredAt);

    // Step 7 — return
    return new NewAuthentication({ accessToken, refreshToken });
  }
}
