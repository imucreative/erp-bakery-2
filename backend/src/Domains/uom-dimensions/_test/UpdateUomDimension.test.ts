import { UpdateUomDimension } from '../entities/UpdateUomDimension';

describe('UpdateUomDimension', () => {
  it('should return only provided fields', () => {
    expect(new UpdateUomDimension({ name: 'Panjang' }).fields).toEqual({ name: 'Panjang' });
  });

  it('should coerce isActive to boolean', () => {
    expect(new UpdateUomDimension({ isActive: false }).fields.isActive).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when no updatable field is present', () => {
    expect(() => new UpdateUomDimension({})).toThrow(
      'UPDATE_UOM_DIMENSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(() => new UpdateUomDimension(null)).toThrow(
      'UPDATE_UOM_DIMENSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new UpdateUomDimension({ name: 123 })).toThrow(
      'UPDATE_UOM_DIMENSION.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when isActive is not a boolean', () => {
    expect(() => new UpdateUomDimension({ isActive: 'no' })).toThrow(
      'UPDATE_UOM_DIMENSION.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name is empty after trim or too long', () => {
    expect(() => new UpdateUomDimension({ name: '  ' })).toThrow(
      'UPDATE_UOM_DIMENSION.NAME_LIMIT_CHAR',
    );
    expect(() => new UpdateUomDimension({ name: 'a'.repeat(101) })).toThrow(
      'UPDATE_UOM_DIMENSION.NAME_LIMIT_CHAR',
    );
  });
});
