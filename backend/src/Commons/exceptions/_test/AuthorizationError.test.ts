import { AuthorizationError } from '../AuthorizationError';
import { ClientError } from '../ClientError';

describe('AuthorizationError', () => {
  it('should create error with statusCode 403', () => {
    const error = new AuthorizationError('forbidden');

    expect(error.message).toBe('forbidden');
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('AuthorizationError');
  });

  it('should be an instance of ClientError and Error', () => {
    const error = new AuthorizationError('forbidden');

    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(Error);
  });
});
