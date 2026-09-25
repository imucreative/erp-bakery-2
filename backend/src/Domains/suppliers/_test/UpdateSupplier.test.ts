import { UpdateSupplier } from '../entities/UpdateSupplier';

describe('UpdateSupplier', () => {
  it('should return only provided fields', () => {
    expect(new UpdateSupplier({ name: 'PT Baru' }).fields).toEqual({ name: 'PT Baru' });
  });

  it('should allow nulling optional fields', () => {
    const entity = new UpdateSupplier({ address: null, phone: null, picName: null });
    expect(entity.fields.address).toBeNull();
    expect(entity.fields.phone).toBeNull();
    expect(entity.fields.picName).toBeNull();
  });

  it('should coerce isActive to boolean', () => {
    expect(new UpdateSupplier({ isActive: false }).fields.isActive).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when no updatable field is present', () => {
    expect(() => new UpdateSupplier({})).toThrow('UPDATE_SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when phone is not a string', () => {
    expect(() => new UpdateSupplier({ phone: 123 })).toThrow(
      'UPDATE_SUPPLIER.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name is empty after trim', () => {
    expect(() => new UpdateSupplier({ name: '  ' })).toThrow('UPDATE_SUPPLIER.NAME_LIMIT_CHAR');
  });

  it('should throw PHONE_LIMIT_CHAR when phone exceeds 30 characters', () => {
    expect(() => new UpdateSupplier({ phone: '1'.repeat(31) })).toThrow(
      'UPDATE_SUPPLIER.PHONE_LIMIT_CHAR',
    );
  });
});
