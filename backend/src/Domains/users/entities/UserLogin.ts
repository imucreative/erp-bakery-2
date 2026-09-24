/**
 * Domain Entity: UserLogin
 * Validates login credentials payload.
 */
export class UserLogin {
  public readonly email: string;
  public readonly password: string;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { email, password } = payload as Record<string, string>;

    this.email = email.trim().toLowerCase();
    this.password = password;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { email, password } = payload as Record<string, unknown>;

    if (!email || !password) {
      throw new Error('USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('USER_LOGIN.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
