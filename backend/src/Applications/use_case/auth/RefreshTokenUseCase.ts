import { RefreshAuthentication } from '../../../Domains/authentications/entities/RefreshAuthentication';
import { AuthenticationRepository } from '../../../Domains/authentications/AuthenticationRepository';
import { UserRepository } from '../../../Domains/users/UserRepository';
import { TokenManager } from '../../security/TokenManager';

/**
 * UseCase: RefreshTokenUseCase
 *
 * 1. Validate refresh token payload (domain entity)
 * 2. Verify token exists in store (not revoked)
 * 3. Verify + decode the refresh token signature
 * 4. Fetch user + fresh permissions (roles may have changed)
 * 5. Issue a new access token
 * 6. Return new access token
 */
export class RefreshTokenUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly userRepository: UserRepository,
    private readonly tokenManager: TokenManager,
  ) {}

  async execute(payload: unknown): Promise<string> {
    // Step 1 — validate payload
    const { refreshToken } = new RefreshAuthentication(payload);

    // Step 2 — verify token exists in store
    await this.authenticationRepository.verifyRefreshToken(refreshToken);

    // Step 3 — verify signature + decode
    const decoded = await this.tokenManager.verifyRefreshToken(refreshToken);

    // Step 4 — fetch fresh user data + permissions
    const user = await this.userRepository.getUserWithPermissionsById(decoded.sub);

    // Step 5 — issue new access token
    const accessToken = await this.tokenManager.createAccessToken({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions,
      roleCode: user.roleCode,
    });

    return accessToken;
  }
}
