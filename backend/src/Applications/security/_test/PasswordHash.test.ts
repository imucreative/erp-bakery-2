import { PasswordHash } from '../PasswordHash';

describe('PasswordHash (abstract contract)', () => {
  class TestPasswordHash extends PasswordHash {
    async hash(_password: string): Promise<string> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async comparePassword(_password: string, _hashedPassword: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const passwordHash = new TestPasswordHash();

  it('hash should throw when not implemented', async () => {
    await expect(passwordHash.hash('password')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('comparePassword should throw when not implemented', async () => {
    await expect(passwordHash.comparePassword('plain', 'hashed')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
