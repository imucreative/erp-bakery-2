import { BcryptPasswordHash } from '../BcryptPasswordHash';
import { AuthenticationError } from '../../../Commons/exceptions/AuthenticationError';

describe('BcryptPasswordHash', () => {
  let bcryptHash: BcryptPasswordHash;

  beforeEach(() => {
    // Use 1 salt round in tests for speed
    bcryptHash = new BcryptPasswordHash(1);
  });

  describe('hash', () => {
    it('should return a hashed string', async () => {
      const result = await bcryptHash.hash('plainPassword');

      expect(result).toBeDefined();
      expect(result).not.toBe('plainPassword');
      expect(result.length).toBeGreaterThan(20);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await bcryptHash.hash('same');
      const hash2 = await bcryptHash.hash('same');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should resolve when passwords match', async () => {
      const hashed = await bcryptHash.hash('correct');

      await expect(bcryptHash.comparePassword('correct', hashed)).resolves.toBeUndefined();
    });

    it('should throw AuthenticationError when passwords do not match', async () => {
      const hashed = await bcryptHash.hash('correct');

      await expect(bcryptHash.comparePassword('wrong', hashed)).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });

    it('should throw with AUTHENTICATION.CREDENTIALS_NOT_VALID message', async () => {
      const hashed = await bcryptHash.hash('correct');

      await expect(bcryptHash.comparePassword('wrong', hashed)).rejects.toThrow(
        'AUTHENTICATION.CREDENTIALS_NOT_VALID',
      );
    });
  });
});
