import { ClientError } from '../ClientError';

// Concrete subclass for testing purposes only
class ConcreteClientError extends ClientError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = 'ConcreteClientError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

describe('ClientError', () => {
  it('should create error with correct message and default statusCode 400', () => {
    const error = new ConcreteClientError('test error');

    expect(error.message).toBe('test error');
    expect(error.statusCode).toBe(400);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ClientError);
  });

  it('should create error with custom statusCode', () => {
    const error = new ConcreteClientError('not found', 404);

    expect(error.statusCode).toBe(404);
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new ConcreteClientError('thrown error');
    }).toThrow('thrown error');
  });
});
