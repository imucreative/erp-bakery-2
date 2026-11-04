import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { SecretCipher } from '../../Applications/security/SecretCipher';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * AES-256-GCM implementation of SecretCipher.
 * Key comes from `TOTP_ENCRYPTION_KEY` (64 hex chars = 32 bytes).
 */
export class AesGcmSecretCipher extends SecretCipher {
  private readonly key: Buffer;

  constructor(keyHex: string) {
    super();
    const key = Buffer.from(keyHex.trim(), 'hex');
    if (key.length !== KEY_BYTES) {
      throw new Error('TOTP_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join('.');
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('INVALID_CIPHERTEXT');
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
