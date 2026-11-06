import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Totp } from '../../Applications/security/Totp';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DIGITS = 6;
const PERIOD_SECONDS = 30;
const WINDOW = 1;

/**
 * RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30s period) built on Node's crypto.
 * No third-party dependency: the algorithm is small and fully covered by the
 * RFC test vectors in `_test/RfcTotp.test.ts`.
 */
export class RfcTotp extends Totp {
  generateSecret(): string {
    return base32Encode(randomBytes(20));
  }

  buildOtpAuthUri(secret: string, accountEmail: string, issuer: string): string {
    const label = encodeURIComponent(`${issuer}:${accountEmail}`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: String(DIGITS),
      period: String(PERIOD_SECONDS),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  verify(secret: string, code: string, at: Date = new Date()): boolean {
    const normalized = (code ?? '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalized)) {
      return false;
    }

    let key: Buffer;
    try {
      key = base32Decode(secret);
    } catch {
      return false;
    }

    const counter = Math.floor(at.getTime() / 1000 / PERIOD_SECONDS);
    for (let offset = -WINDOW; offset <= WINDOW; offset += 1) {
      const candidate = hotp(key, counter + offset);
      if (safeEqual(candidate, normalized)) {
        return true;
      }
    }
    return false;
  }
}

/** HOTP (RFC 4226) — HMAC-SHA1 with dynamic truncation. */
function hotp(key: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('INVALID_BASE32');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}
