import { RegisterCompany } from '../entities/RegisterCompany';

const validPayload = {
  name: 'Toko Roti Makmur',
  slug: 'toko-roti-makmur',
  ownerName: 'Budi Santoso',
  ownerEmail: 'budi@rotimakmur.com',
  ownerPassword: 'Secret1234',
};

describe('RegisterCompany', () => {
  it('should create entity with correct properties', () => {
    const entity = new RegisterCompany(validPayload);

    expect(entity.name).toBe('Toko Roti Makmur');
    expect(entity.slug).toBe('toko-roti-makmur');
    expect(entity.ownerName).toBe('Budi Santoso');
    expect(entity.ownerEmail).toBe('budi@rotimakmur.com');
    expect(entity.ownerPassword).toBe('Secret1234');
  });

  it('should normalize slug by trimming whitespace', () => {
    const entity = new RegisterCompany({ ...validPayload, slug: '  toko-roti  ' });

    expect(entity.slug).toBe('toko-roti');
  });

  it('should normalize email to lowercase', () => {
    const entity = new RegisterCompany({ ...validPayload, ownerEmail: 'BUDI@ROTI.COM' });

    expect(entity.ownerEmail).toBe('budi@roti.com');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new RegisterCompany({ ...validPayload, name: '' })).toThrow(
      'REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when slug is missing', () => {
    expect(() => new RegisterCompany({ ...validPayload, slug: '' })).toThrow(
      'REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when ownerEmail is missing', () => {
    expect(() => new RegisterCompany({ ...validPayload, ownerEmail: '' })).toThrow(
      'REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when ownerPassword is missing', () => {
    expect(() => new RegisterCompany({ ...validPayload, ownerPassword: '' })).toThrow(
      'REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new RegisterCompany(null)).toThrow(
      'REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new RegisterCompany({ ...validPayload, name: 123 })).toThrow(
      'REGISTER_COMPANY.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(
      () => new RegisterCompany({ ...validPayload, name: 'a'.repeat(101) }),
    ).toThrow('REGISTER_COMPANY.NAME_LIMIT_CHAR');
  });

  it('should throw SLUG_CONTAIN_RESTRICTED_CHARACTER when slug has spaces', () => {
    expect(
      () => new RegisterCompany({ ...validPayload, slug: 'toko roti' }),
    ).toThrow('REGISTER_COMPANY.SLUG_CONTAIN_RESTRICTED_CHARACTER');
  });

  it('should throw SLUG_CONTAIN_RESTRICTED_CHARACTER when slug has uppercase', () => {
    // 'TokoRoti' contains uppercase letters — regex /^[a-z0-9-]+$/ rejects it
    expect(
      () => new RegisterCompany({ ...validPayload, slug: 'TOKO-ROTI' }),
    ).toThrow('REGISTER_COMPANY.SLUG_CONTAIN_RESTRICTED_CHARACTER');
  });

  it('should throw SLUG_CONTAIN_RESTRICTED_CHARACTER when slug has special chars', () => {
    expect(
      () => new RegisterCompany({ ...validPayload, slug: 'toko_roti!' }),
    ).toThrow('REGISTER_COMPANY.SLUG_CONTAIN_RESTRICTED_CHARACTER');
  });

  it('should allow slug with numbers and hyphens', () => {
    expect(
      () => new RegisterCompany({ ...validPayload, slug: 'roti-123' }),
    ).not.toThrow();
  });
});
