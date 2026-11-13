import { UpdateUom } from '../entities/UpdateUom';

describe('UpdateUom', () => {
  it('should return only provided fields', () => {
    expect(new UpdateUom({ name: 'KG' }).fields).toEqual({ name: 'KG' });
  });

  it('should coerce isActive to boolean', () => {
    expect(new UpdateUom({ isActive: false }).fields.isActive).toBe(false);
  });

  it('should keep dimension and factor when provided', () => {
    expect(new UpdateUom({ dimension: 'WEIGHT', factorToCanonical: 1000 }).fields).toEqual({
      dimension: 'WEIGHT',
      factorToCanonical: 1000,
    });
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

  it('should accept any well-formed dimension code and normalise it to uppercase', () => {
    expect(new UpdateUom({ dimension: ' length ' }).fields.dimension).toBe('LENGTH');
  });

  it('should throw DIMENSION_INVALID for a malformed dimension code', () => {
    for (const dimension of ['length-dash', '1LENGTH', '']) {
      expect(() => new UpdateUom({ dimension })).toThrow('UPDATE_UOM.DIMENSION_INVALID');
    }
  });

  it('should throw FACTOR_INVALID when factor is not positive', () => {
    expect(() => new UpdateUom({ factorToCanonical: 0 })).toThrow('UPDATE_UOM.FACTOR_INVALID');
    expect(() => new UpdateUom({ factorToCanonical: -1 })).toThrow('UPDATE_UOM.FACTOR_INVALID');
  });

  it('should throw FACTOR_BELOW_CANONICAL when factor is between 0 and 1', () => {
    expect(() => new UpdateUom({ factorToCanonical: 0.5 })).toThrow(
      'UPDATE_UOM.FACTOR_BELOW_CANONICAL',
    );
  });
});
