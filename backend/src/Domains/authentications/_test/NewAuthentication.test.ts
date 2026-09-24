import { NewAuthentication } from '../entities/NewAuthentication';

describe('NewAuthentication', () => {
  it('should create entity with correct tokens', () => {
    const entity = new NewAuthentication({
      accessToken: 'access.token.here',
      refreshToken: 'refresh.token.here',
    });

    expect(entity.accessToken).toBe('access.token.here');
    expect(entity.refreshToken).toBe('refresh.token.here');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when accessToken is missing', () => {
    expect(
      () => new NewAuthentication({ accessToken: '', refreshToken: 'refresh' }),
    ).toThrow('NEW_AUTHENTICATION.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when refreshToken is missing', () => {
    expect(
      () => new NewAuthentication({ accessToken: 'access', refreshToken: '' }),
    ).toThrow('NEW_AUTHENTICATION.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when tokens are not strings', () => {
    expect(
      () => new NewAuthentication({ accessToken: 123 as unknown as string, refreshToken: 'refresh' }),
    ).toThrow('NEW_AUTHENTICATION.NOT_MEET_DATA_TYPE_SPECIFICATION');
  });
});
