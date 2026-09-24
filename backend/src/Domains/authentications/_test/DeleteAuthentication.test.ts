import { DeleteAuthentication } from '../entities/DeleteAuthentication';

describe('DeleteAuthentication', () => {
  it('should create entity with refreshToken', () => {
    const entity = new DeleteAuthentication({ refreshToken: 'some.refresh.token' });

    expect(entity.refreshToken).toBe('some.refresh.token');
  });

  it('should throw NOT_CONTAIN_REFRESH_TOKEN when refreshToken is missing', () => {
    expect(() => new DeleteAuthentication({ refreshToken: '' })).toThrow(
      'DELETE_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN',
    );
  });

  it('should throw NOT_CONTAIN_REFRESH_TOKEN when payload is null', () => {
    expect(() => new DeleteAuthentication(null)).toThrow(
      'DELETE_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN',
    );
  });

  it('should throw PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION when not string', () => {
    expect(() => new DeleteAuthentication({ refreshToken: 456 })).toThrow(
      'DELETE_AUTHENTICATION.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });
});
