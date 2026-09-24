/**
 * Domain Entity: RegisterUser
 * Validates payload for creating a new user (owner or staff).
 */
export class RegisterUser {
  public readonly name: string;
  public readonly email: string;
  public password: string; // mutable — replaced with bcrypt hash
  public readonly phone: string | null;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { name, email, password, phone } = payload as Record<string, unknown>;

    this.name = (name as string).trim();
    this.email = (email as string).trim().toLowerCase();
    this.password = password as string;
    this.phone = phone ? String(phone).trim() : null;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('REGISTER_USER.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { name, email, password } = payload as Record<string, unknown>;

    if (!name || !email || !password) {
      throw new Error('REGISTER_USER.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      throw new Error('REGISTER_USER.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if ((name as string).trim().length > 100) {
      throw new Error('REGISTER_USER.NAME_LIMIT_CHAR');
    }

    if ((email as string).trim().length > 100) {
      throw new Error('REGISTER_USER.EMAIL_LIMIT_CHAR');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test((email as string).trim())) {
      throw new Error('REGISTER_USER.INVALID_EMAIL_FORMAT');
    }

    if ((password as string).length < 8) {
      throw new Error('REGISTER_USER.PASSWORD_MIN_LENGTH');
    }
  }
}
