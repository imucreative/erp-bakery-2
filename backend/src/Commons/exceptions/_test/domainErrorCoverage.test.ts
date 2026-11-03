import * as fs from 'fs';
import * as path from 'path';
import DomainErrorTranslator from '../DomainErrorTranslator';

/**
 * A domain code that reaches AllExceptionsFilter without a translation entry
 * becomes an opaque 500, so this test treats "every thrown code is registered"
 * as an invariant rather than a convention.
 */

const SRC_ROOT = path.resolve(__dirname, '../../..');

/**
 * Guards that run while rebuilding an entity from a token or a database row.
 * Tripping one means our own data is malformed, so 500 is the honest answer and
 * a user-facing translation would be a lie.
 */
const INTERNAL_ONLY_CODES = new Set([
  'NEW_AUTHENTICATION.NOT_CONTAIN_NEEDED_PROPERTY',
  'NEW_AUTHENTICATION.NOT_MEET_DATA_TYPE_SPECIFICATION',
  'REGISTERED_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY',
  'REGISTERED_USER.NOT_CONTAIN_NEEDED_PROPERTY',
  'ROLE.NOT_CONTAIN_NEEDED_PROPERTY',
]);

function collectSourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '_test') collectSourceFiles(full, found);
    } else if (entry.name.endsWith('.ts') && !entry.name.includes('DomainErrorTranslator')) {
      found.push(full);
    }
  }
  return found;
}

function collectThrownCodes(): Map<string, string> {
  const codes = new Map<string, string>();
  for (const file of collectSourceFiles(SRC_ROOT)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/throw new Error\(\s*'([A-Z][A-Z0-9_]*\.[A-Z0-9_.]+)'/g)) {
      if (!codes.has(match[1])) codes.set(match[1], path.relative(SRC_ROOT, file));
    }
  }
  return codes;
}

describe('domain error code coverage', () => {
  const thrown = collectThrownCodes();

  it('should find domain codes to check', () => {
    // Guards the scanner itself: a broken regex would make this suite vacuous.
    expect(thrown.size).toBeGreaterThan(200);
  });

  it('should have a translation for every user-facing domain code thrown in src', () => {
    const untranslated = [...thrown]
      .filter(([code]) => !INTERNAL_ONLY_CODES.has(code))
      .filter(([code]) => DomainErrorTranslator.translate(new Error(code)).message === code)
      .map(([code, file]) => `${code} (${file})`);

    expect(untranslated).toEqual([]);
  });

  it('should keep every registered code resolving to a ClientError with a real message', () => {
    for (const code of Object.keys(DomainErrorTranslator._directories)) {
      const translated = DomainErrorTranslator._directories[code];
      expect(translated.statusCode).toBeGreaterThanOrEqual(400);
      expect(translated.statusCode).toBeLessThan(500);
      expect(translated.message).not.toBe(code);
      expect(translated.message.trim().length).toBeGreaterThan(0);
    }
  });

  it('should not translate the internal construction guards', () => {
    for (const code of INTERNAL_ONLY_CODES) {
      expect(DomainErrorTranslator.translate(new Error(code)).message).toBe(code);
    }
  });
});
