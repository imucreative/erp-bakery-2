/**
 * Domain Entity: NewAuthentication
 * Value object representing a freshly issued token pair.
 */
export class NewAuthentication {
  public readonly accessToken: string;
  public readonly refreshToken: string;

  constructor(payload: { accessToken: string; refreshToken: string }) {
    const { accessToken, refreshToken } = payload;

    if (!accessToken || !refreshToken) {
      throw new Error('NEW_AUTHENTICATION.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      throw new Error('NEW_AUTHENTICATION.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}
