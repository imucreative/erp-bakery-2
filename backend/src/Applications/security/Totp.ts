/**
 * Abstract security interface: Totp
 * Concrete implementation: RfcTotp (Infrastructures/security/)
 *
 * Time-based one-time passwords (RFC 6238) used for Super Admin 2FA.
 */
export interface TotpSetupData {
  /** Base32 shared secret (plaintext — callers must encrypt before persisting). */
  secret: string;
  /** otpauth:// URI for authenticator apps (manual entry / QR payload). */
  otpauthUri: string;
}

export abstract class Totp {
  /** Generate a new Base32 shared secret. */
  abstract generateSecret(): string;

  /** Build the otpauth:// provisioning URI for an authenticator app. */
  abstract buildOtpAuthUri(secret: string, accountEmail: string, issuer: string): string;

  /**
   * Verify a 6-digit code against the secret.
   * `at` allows deterministic testing; defaults to now.
   * Accepts a ±1 step (30s) window for clock drift.
   */
  abstract verify(secret: string, code: string, at?: Date): boolean;
}
