/**
 * Domain Entity: DeleteAuthentication
 * Validates the logout payload (refresh token to revoke).
 */
export class DeleteAuthentication {
  public readonly refreshToken: string;

  constructor(payload: unknown) {
    this._verifyPayload(payload);
    const { refreshToken } = payload as Record<string, string>;
    this.refreshToken = refreshToken;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('DELETE_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN');
    }

    const { refreshToken } = payload as Record<string, unknown>;

    if (!refreshToken) {
      throw new Error('DELETE_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN');
    }

    if (typeof refreshToken !== 'string') {
      throw new Error(
        'DELETE_AUTHENTICATION.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION',
      );
    }
  }
}
