import { RegisterUser } from '../entities/RegisterUser';

const validPayload = {
  name: 'Budi Santoso',
  email: 'budi@example.com',
  password: 'Secret123',
  phone: '081234567890',
};

describe('RegisterUser', () => {
  it('should create entity with correct properties', () => {
    const entity = new RegisterUser(validPayload);

    expect(entity.name).toBe('Budi Santoso');
    expect(entity.email).toBe('budi@example.com');
    expect(entity.password).toBe('Secret123');
    expect(entity.phone).toBe('081234567890');
  });

  it('should normalize email to lowercase', () => {
    const entity = new RegisterUser({ ...validPayload, email: 'BUDI@EXAMPLE.COM' });

    expect(entity.email).toBe('budi@example.com');
  });

  it('should set phone to null when not provided', () => {
    const entity = new RegisterUser({ name: validPayload.name, email: validPayload.email, password: validPayload.password });

    expect(entity.phone).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new RegisterUser({ ...validPayload, name: '' })).toThrow(
      'REGISTER_USER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when email is missing', () => {
    expect(() => new RegisterUser({ ...validPayload, email: '' })).toThrow(
      'REGISTER_USER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when password is missing', () => {
    expect(() => new RegisterUser({ ...validPayload, password: '' })).toThrow(
      'REGISTER_USER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new RegisterUser(null)).toThrow(
      'REGISTER_USER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not string', () => {
    expect(() => new RegisterUser({ ...validPayload, name: 123 })).toThrow(
      'REGISTER_USER.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 chars', () => {
    expect(() => new RegisterUser({ ...validPayload, name: 'a'.repeat(101) })).toThrow(
      'REGISTER_USER.NAME_LIMIT_CHAR',
    );
  });

  it('should throw EMAIL_LIMIT_CHAR when email exceeds 100 chars', () => {
    const longEmail = 'a'.repeat(90) + '@example.com';
    expect(() => new RegisterUser({ ...validPayload, email: longEmail })).toThrow(
      'REGISTER_USER.EMAIL_LIMIT_CHAR',
    );
  });

  it('should throw INVALID_EMAIL_FORMAT for invalid email', () => {
    expect(() => new RegisterUser({ ...validPayload, email: 'not-an-email' })).toThrow(
      'REGISTER_USER.INVALID_EMAIL_FORMAT',
    );
  });

  it('should throw INVALID_EMAIL_FORMAT for email without domain', () => {
    expect(() => new RegisterUser({ ...validPayload, email: 'budi@' })).toThrow(
      'REGISTER_USER.INVALID_EMAIL_FORMAT',
    );
  });

  it('should throw PASSWORD_MIN_LENGTH when password less than 8 chars', () => {
    expect(() => new RegisterUser({ ...validPayload, password: 'abc123' })).toThrow(
      'REGISTER_USER.PASSWORD_MIN_LENGTH',
    );
  });
});
