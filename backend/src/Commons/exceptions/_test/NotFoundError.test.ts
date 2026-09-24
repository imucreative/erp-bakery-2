import { NotFoundError } from '../NotFoundError';
import { ClientError } from '../ClientError';

describe('NotFoundError', () => {
  it('should create error with statusCode 404', () => {
    const error = new NotFoundError('resource not found');

    expect(error.message).toBe('resource not found');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('NotFoundError');
  });

  it('should be an instance of ClientError and Error', () => {
    const error = new NotFoundError('not found');

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(Error);
  });
});
