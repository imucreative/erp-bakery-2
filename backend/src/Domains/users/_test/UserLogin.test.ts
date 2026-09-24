import { UserLogin } from '../entities/UserLogin';

describe('UserLogin', () => {
  it('should create entity with correct properties', () => {
    const entity = new UserLogin({ email: 'budi@example.com', password: 'Secret123' });

    expect(entity.email).toBe('budi@example.com');
    expect(entity.password).toBe('Secret123');
  });

  it('should normalize email to lowercase', () => {
    const entity = new UserLogin({ email: 'BUDI@EXAMPLE.COM', password: 'pass' });

    expect(entity.email).toBe('budi@example.com');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when email is missing', () => {
    expect(() => new UserLogin({ email: '', password: 'pass' })).toThrow(
      'USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when password is missing', () => {
    expect(() => new UserLogin({ email: 'a@b.com', password: '' })).toThrow(
      'USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new UserLogin(null)).toThrow(
      'USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when email is not string', () => {
    expect(() => new UserLogin({ email: 123, password: 'pass' })).toThrow(
      'USER_LOGIN.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when password is not string', () => {
    expect(() => new UserLogin({ email: 'a@b.com', password: 123 })).toThrow(
      'USER_LOGIN.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });
});
