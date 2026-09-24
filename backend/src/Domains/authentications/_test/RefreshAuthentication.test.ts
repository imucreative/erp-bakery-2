import { RefreshAuthentication } from '../entities/RefreshAuthentication';

describe('RefreshAuthentication', () => {
  it('should create entity with refreshToken', () => {
    const entity = new RefreshAuthentication({ refreshToken: 'some.refresh.token' });

    expect(entity.refreshToken).toBe('some.refresh.token');
  });

  it('should throw NOT_CONTAIN_REFRESH_TOKEN when refreshToken is missing', () => {
    expect(() => new RefreshAuthentication({ refreshToken: '' })).toThrow(
      'REFRESH_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN',
    );
  });

  it('should throw NOT_CONTAIN_REFRESH_TOKEN when payload is null', () => {
    expect(() => new RefreshAuthentication(null)).toThrow(
      'REFRESH_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN',
    );
  });

  it('should throw PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION when refreshToken is not string', () => {
    expect(() => new RefreshAuthentication({ refreshToken: 123 })).toThrow(
      'REFRESH_AUTHENTICATION.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });
});
