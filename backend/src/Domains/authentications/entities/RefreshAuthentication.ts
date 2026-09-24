/**
 * Domain Entity: RefreshAuthentication
 * Validates the refresh token payload sent by the client.
 */
export class RefreshAuthentication {
  public readonly refreshToken: string;

  constructor(payload: unknown) {
    this._verifyPayload(payload);
    const { refreshToken } = payload as Record<string, string>;
    this.refreshToken = refreshToken;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('REFRESH_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN');
    }

    const { refreshToken } = payload as Record<string, unknown>;

    if (!refreshToken) {
      throw new Error('REFRESH_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN');
    }

    if (typeof refreshToken !== 'string') {
      throw new Error(
        'REFRESH_AUTHENTICATION.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION',
      );
    }
  }
}
