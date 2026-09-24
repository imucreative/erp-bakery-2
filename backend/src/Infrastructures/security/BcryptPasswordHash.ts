import * as bcrypt from 'bcrypt';
import { PasswordHash } from '../../Applications/security/PasswordHash';
import { AuthenticationError } from '../../Commons/exceptions/AuthenticationError';

/**
 * Concrete implementation of PasswordHash using bcrypt.
 * Registered in InfrastructureModule as NestJS provider.
 */
export class BcryptPasswordHash extends PasswordHash {
  private readonly saltRounds: number;

  constructor(saltRounds = 10) {
    super();
    this.saltRounds = saltRounds;
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<void> {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      throw new AuthenticationError('AUTHENTICATION.CREDENTIALS_NOT_VALID');
    }
  }
}
