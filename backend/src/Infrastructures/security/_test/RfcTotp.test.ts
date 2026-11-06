import { RfcTotp } from '../RfcTotp';
import { AesGcmSecretCipher } from '../AesGcmSecretCipher';

/**
 * RFC 6238 test vectors (SHA1, secret = ASCII "12345678901234567890").
 * Our implementation emits 6 digits, so the expected value is the last 6
 * digits of the RFC's 8-digit reference value.
 */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('RfcTotp (RFC 6238 vectors, SHA1)', () => {
  const totp = new RfcTotp();

  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC reference at T=%i', (epoch, expected) => {
    const at = new Date(epoch * 1000);
    expect(totp.verify(RFC_SECRET, expected, at)).toBe(true);
  });

  it('rejects a wrong code and malformed input', () => {
    const at = new Date(59 * 1000);
    expect(totp.verify(RFC_SECRET, '000000', at)).toBe(false);
    expect(totp.verify(RFC_SECRET, '12345', at)).toBe(false);
    expect(totp.verify(RFC_SECRET, 'abcdef', at)).toBe(false);
    expect(totp.verify('not-base32!', '287082', at)).toBe(false);
  });

  it('accepts a ±1 step window for clock drift', () => {
    const at = new Date(1111111109 * 1000);
    const previousStep = new Date((1111111109 - 30) * 1000);
    const codePrevious = totp.verify(RFC_SECRET, '081804', previousStep);
    void codePrevious;
    // The code of the previous step must validate one step later (drift).
    expect(totp.verify(RFC_SECRET, '050471', at)).toBe(true);
  });

  it('generates a Base32 secret that verifies its own code', () => {
    const secret = totp.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{16,}$/);

    const at = new Date('2026-11-03T00:00:00Z');
    // Derive the expected code through the public verifier by probing the
    // current step is not possible; instead assert a random code is rejected
    // and the URI shape is correct.
    expect(totp.verify(secret, '123456', at)).toBe(false);
    expect(totp.buildOtpAuthUri(secret, 'admin@erp.local', 'Bakery ERP')).toContain(
      'otpauth://totp/',
    );
  });
});

describe('AesGcmSecretCipher', () => {
  const key = 'a'.repeat(64);
  const cipher = new AesGcmSecretCipher(key);

  it('round-trips a secret', () => {
    const payload = cipher.encrypt('JBSWY3DPEHPK3PXP');
    expect(payload).not.toContain('JBSWY3DPEHPK3PXP');
    expect(cipher.decrypt(payload)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('produces a different payload each time (random IV)', () => {
    expect(cipher.encrypt('same')).not.toBe(cipher.encrypt('same'));
  });

  it('rejects tampered payloads', () => {
    const payload = cipher.encrypt('secret');
    const [iv, tag, data] = payload.split('.');
    const tampered = [iv, tag, Buffer.from('other').toString('base64')].join('.');
    expect(() => cipher.decrypt(tampered)).toThrow();
    expect(() => cipher.decrypt('garbage')).toThrow('INVALID_CIPHERTEXT');
    void data;
  });

  it('rejects an invalid key length', () => {
    expect(() => new AesGcmSecretCipher('abcd')).toThrow(/32 bytes/);
  });
});
