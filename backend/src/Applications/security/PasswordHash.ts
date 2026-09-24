/**
 * Abstract security interface: PasswordHash
 * Concrete implementation: BcryptPasswordHash (Infrastructures/security/)
 */
export abstract class PasswordHash {
  /**
   * Hash a plain-text password.
   */
  abstract hash(password: string): Promise<string>;

  /**
   * Compare plain-text password against stored hash.
   * Throws AUTHENTICATION.CREDENTIALS_NOT_VALID if mismatch.
   */
  abstract comparePassword(password: string, hashedPassword: string): Promise<void>;
}
