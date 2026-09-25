import { UpdateOutlet } from '../entities/UpdateOutlet';

describe('UpdateOutlet', () => {
  it('should collect only the provided fields', () => {
    const entity = new UpdateOutlet({ name: 'Renamed' });

    expect(entity.fields).toEqual({ name: 'Renamed' });
  });

  it('should trim name and phone', () => {
    const entity = new UpdateOutlet({ name: '  A  ', phone: '  021  ' });

    expect(entity.fields.name).toBe('A');
    expect(entity.fields.phone).toBe('021');
  });

  it('should preserve explicit null for address and phone', () => {
    const entity = new UpdateOutlet({ address: null, phone: null });

    expect(entity.fields.address).toBeNull();
    expect(entity.fields.phone).toBeNull();
  });

  it('should coerce isActive to boolean', () => {
    const entity = new UpdateOutlet({ isActive: false });

    expect(entity.fields.isActive).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new UpdateOutlet(null)).toThrow(
      'UPDATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when no updatable field is sent', () => {
    expect(() => new UpdateOutlet({})).toThrow(
      'UPDATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new UpdateOutlet({ name: 123 })).toThrow(
      'UPDATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when isActive is not a boolean', () => {
    expect(() => new UpdateOutlet({ isActive: 'yes' })).toThrow(
      'UPDATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name is empty', () => {
    expect(() => new UpdateOutlet({ name: '   ' })).toThrow(
      'UPDATE_OUTLET.NAME_LIMIT_CHAR',
    );
  });

  it('should throw PHONE_LIMIT_CHAR when phone exceeds 30 characters', () => {
    expect(() => new UpdateOutlet({ phone: '1'.repeat(31) })).toThrow(
      'UPDATE_OUTLET.PHONE_LIMIT_CHAR',
    );
  });
});
