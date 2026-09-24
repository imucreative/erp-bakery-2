import { ConflictError } from '../ConflictError';
import { ClientError } from '../ClientError';

describe('ConflictError', () => {
  it('should create error with statusCode 409', () => {
    const error = new ConflictError('already exists');

    expect(error.message).toBe('already exists');
    expect(error.statusCode).toBe(409);
    expect(error.name).toBe('ConflictError');
  });

  it('should be an instance of ClientError and Error', () => {
    const error = new ConflictError('conflict');

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(Error);
  });
});
