import { DeleteAuthentication } from '../../../Domains/authentications/entities/DeleteAuthentication';
import { AuthenticationRepository } from '../../../Domains/authentications/AuthenticationRepository';

/**
 * UseCase: LogoutUseCase
 *
 * 1. Validate refresh token payload (domain entity)
 * 2. Verify the token exists in the store
 * 3. Delete (revoke) the refresh token
 */
export class LogoutUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
  ) {}

  async execute(payload: unknown): Promise<void> {
    // Step 1 — validate
    const { refreshToken } = new DeleteAuthentication(payload);

    // Step 2 — verify it exists (prevents silent no-op on invalid tokens)
    await this.authenticationRepository.verifyRefreshToken(refreshToken);

    // Step 3 — revoke
    await this.authenticationRepository.deleteRefreshToken(refreshToken);
  }
}
