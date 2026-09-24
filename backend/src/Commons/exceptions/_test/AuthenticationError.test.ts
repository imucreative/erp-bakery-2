import { AuthenticationError } from '../AuthenticationError';
import { ClientError } from '../ClientError';

describe('AuthenticationError', () => {
  it('should create error with statusCode 401', () => {
    const error = new AuthenticationError('unauthenticated');

    expect(error.message).toBe('unauthenticated');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthenticationError');
  });

  it('should be an instance of ClientError and Error', () => {
    const error = new AuthenticationError('unauthenticated');

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(Error);
  });
});
