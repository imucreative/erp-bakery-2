import { CreateSupplier } from '../entities/CreateSupplier';

describe('CreateSupplier', () => {
  const valid = { name: 'PT Tepung', address: 'Jl. A', phone: '021', picName: 'Budi' };

  it('should create entity with trimmed values', () => {
    const entity = new CreateSupplier({ name: '  PT Tepung  ', picName: '  Budi  ' });
    expect(entity.name).toBe('PT Tepung');
    expect(entity.picName).toBe('Budi');
  });

  it('should default optional fields to null', () => {
    const entity = new CreateSupplier({ name: 'PT Tepung' });
    expect(entity.address).toBeNull();
    expect(entity.phone).toBeNull();
    expect(entity.picName).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new CreateSupplier({ name: '' })).toThrow(
      'CREATE_SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreateSupplier(null)).toThrow(
      'CREATE_SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new CreateSupplier({ name: 123 })).toThrow(
      'CREATE_SUPPLIER.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when picName is not a string', () => {
    expect(() => new CreateSupplier({ name: 'PT', picName: 123 })).toThrow(
      'CREATE_SUPPLIER.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(() => new CreateSupplier({ name: 'a'.repeat(101) })).toThrow(
      'CREATE_SUPPLIER.NAME_LIMIT_CHAR',
    );
  });

  it('should throw PHONE_LIMIT_CHAR when phone exceeds 30 characters', () => {
    expect(() => new CreateSupplier({ name: 'PT', phone: '1'.repeat(31) })).toThrow(
      'CREATE_SUPPLIER.PHONE_LIMIT_CHAR',
    );
  });

  it('should throw PIC_NAME_LIMIT_CHAR when picName exceeds 100 characters', () => {
    expect(() => new CreateSupplier({ name: 'PT', picName: 'a'.repeat(101) })).toThrow(
      'CREATE_SUPPLIER.PIC_NAME_LIMIT_CHAR',
    );
  });
});
