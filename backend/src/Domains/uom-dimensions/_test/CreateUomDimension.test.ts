import { CreateUomDimension } from '../entities/CreateUomDimension';

const valid = {
  code: 'LENGTH',
  name: 'Panjang',
  canonicalUnitName: 'milimeter',
  canonicalUnitSymbol: 'mm',
};

describe('CreateUomDimension', () => {
  it('should normalise code to uppercase and trim text fields', () => {
    const entity = new CreateUomDimension({
      ...valid,
      code: '  length ',
      name: '  Panjang  ',
      canonicalUnitName: '  milimeter ',
      canonicalUnitSymbol: ' mm ',
    });
    expect(entity.code).toBe('LENGTH');
    expect(entity.name).toBe('Panjang');
    expect(entity.canonicalUnitName).toBe('milimeter');
    expect(entity.canonicalUnitSymbol).toBe('mm');
  });

  it('should default isActive to true', () => {
    const entity = new CreateUomDimension(valid);
    expect(entity.isActive).toBe(true);
  });

  it('should keep isActive when provided', () => {
    const entity = new CreateUomDimension({ ...valid, isActive: false });
    expect(entity.isActive).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreateUomDimension(null)).toThrow(
      'CREATE_UOM_DIMENSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when a field is missing', () => {
    for (const key of ['code', 'name', 'canonicalUnitName', 'canonicalUnitSymbol']) {
      expect(() => new CreateUomDimension({ ...valid, [key]: undefined })).toThrow(
        'CREATE_UOM_DIMENSION.NOT_CONTAIN_NEEDED_PROPERTY',
      );
    }
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when a field is not a string', () => {
    expect(() => new CreateUomDimension({ ...valid, name: 123 })).toThrow(
      'CREATE_UOM_DIMENSION.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw CODE_INVALID for a malformed code', () => {
    for (const code of ['1LENGTH', 'LENGTH-DASH', 'a'.repeat(21)]) {
      expect(() => new CreateUomDimension({ ...valid, code })).toThrow(
        'CREATE_UOM_DIMENSION.CODE_INVALID',
      );
    }
  });

  it('should throw NAME_LIMIT_CHAR when name is empty or too long', () => {
    expect(() => new CreateUomDimension({ ...valid, name: '  ' })).toThrow(
      'CREATE_UOM_DIMENSION.NAME_LIMIT_CHAR',
    );
    expect(() => new CreateUomDimension({ ...valid, name: 'a'.repeat(101) })).toThrow(
      'CREATE_UOM_DIMENSION.NAME_LIMIT_CHAR',
    );
  });

  it('should throw CANONICAL_UNIT_NAME_LIMIT_CHAR when canonical unit name is invalid', () => {
    expect(() => new CreateUomDimension({ ...valid, canonicalUnitName: ' ' })).toThrow(
      'CREATE_UOM_DIMENSION.CANONICAL_UNIT_NAME_LIMIT_CHAR',
    );
    expect(() => new CreateUomDimension({ ...valid, canonicalUnitName: 'a'.repeat(101) })).toThrow(
      'CREATE_UOM_DIMENSION.CANONICAL_UNIT_NAME_LIMIT_CHAR',
    );
  });

  it('should throw CANONICAL_UNIT_SYMBOL_LIMIT_CHAR when symbol is invalid', () => {
    expect(() => new CreateUomDimension({ ...valid, canonicalUnitSymbol: ' ' })).toThrow(
      'CREATE_UOM_DIMENSION.CANONICAL_UNIT_SYMBOL_LIMIT_CHAR',
    );
    expect(() => new CreateUomDimension({ ...valid, canonicalUnitSymbol: 'a'.repeat(21) })).toThrow(
      'CREATE_UOM_DIMENSION.CANONICAL_UNIT_SYMBOL_LIMIT_CHAR',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when isActive is not a boolean', () => {
    expect(() => new CreateUomDimension({ ...valid, isActive: 'yes' })).toThrow(
      'CREATE_UOM_DIMENSION.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });
});
