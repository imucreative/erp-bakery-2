import { InvariantError } from '../InvariantError';
import { ClientError } from '../ClientError';

describe('InvariantError', () => {
  it('should create error with statusCode 400', () => {
    const error = new InvariantError('invalid data');

    expect(error.message).toBe('invalid data');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('InvariantError');
  });

  it('should be an instance of ClientError and Error', () => {
    const error = new InvariantError('invalid');

    expect(error).toBeInstanceOf(InvariantError);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(Error);
  });
});
