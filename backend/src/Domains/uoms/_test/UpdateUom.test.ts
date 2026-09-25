import { UpdateUom } from '../entities/UpdateUom';

describe('UpdateUom', () => {
  it('should return only provided fields', () => {
    expect(new UpdateUom({ name: 'KG' }).fields).toEqual({ name: 'KG' });
  });

  it('should coerce isActive to boolean', () => {
    expect(new UpdateUom({ isActive: false }).fields.isActive).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when no updatable field is present', () => {
    expect(() => new UpdateUom({})).toThrow('UPDATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new UpdateUom({ name: 123 })).toThrow(
      'UPDATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when isActive is not a boolean', () => {
    expect(() => new UpdateUom({ isActive: 'no' })).toThrow(
      'UPDATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name is empty after trim', () => {
    expect(() => new UpdateUom({ name: '  ' })).toThrow('UPDATE_UOM.NAME_LIMIT_CHAR');
  });
});
