/**
 * Domain Entity: RegisteredUser
 * Value object returned after a user is successfully persisted.
 * Never exposes password.
 */
export class RegisteredUser {
  public readonly id: string;
  public readonly name: string;
  public readonly email: string;

  constructor(payload: { id: string; name: string; email: string }) {
    const { id, name, email } = payload;

    if (!id || !name || !email) {
      throw new Error('REGISTERED_USER.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.name = name;
    this.email = email;
  }
}
