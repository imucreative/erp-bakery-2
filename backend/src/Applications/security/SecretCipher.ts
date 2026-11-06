/**
 * Abstract security interface: SecretCipher
 * Concrete implementation: AesGcmSecretCipher (Infrastructures/security/)
 *
 * Symmetric encryption for secrets that must be readable by the server
 * (e.g. the TOTP shared secret) — hashing is not an option there.
 */
export abstract class SecretCipher {
  /** Encrypt plaintext → opaque, self-contained payload (iv + tag + data). */
  abstract encrypt(plaintext: string): string;

  /** Decrypt a payload produced by {@link encrypt}. Throws on tampering. */
  abstract decrypt(payload: string): string;
}
