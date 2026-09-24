import { RegisteredCompany } from '../entities/RegisteredCompany';

describe('RegisteredCompany', () => {
  it('should create entity with correct properties', () => {
    const entity = new RegisteredCompany({
      id: 'uuid-123',
      code: 'COMP-001',
      name: 'Toko Roti Makmur',
      slug: 'toko-roti-makmur',
    });

    expect(entity.id).toBe('uuid-123');
    expect(entity.code).toBe('COMP-001');
    expect(entity.name).toBe('Toko Roti Makmur');
    expect(entity.slug).toBe('toko-roti-makmur');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when id is missing', () => {
    expect(
      () => new RegisteredCompany({ id: '', code: 'COMP-001', name: 'Roti', slug: 'roti' }),
    ).toThrow('REGISTERED_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(
      () => new RegisteredCompany({ id: 'uuid', code: '', name: 'Roti', slug: 'roti' }),
    ).toThrow('REGISTERED_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY');
  });
});
