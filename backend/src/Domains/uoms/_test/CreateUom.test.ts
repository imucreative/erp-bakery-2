import { CreateUom } from '../entities/CreateUom';

const valid = {
  name: 'PCS',
  dimension: 'COUNT',
  factorToCanonical: 1,
};

describe('CreateUom', () => {
  it('should create entity with trimmed name and conversion metadata', () => {
    const entity = new CreateUom({ ...valid, name: '  PCS  ' });
    expect(entity.name).toBe('PCS');
    expect(entity.dimension).toBe('COUNT');
    expect(entity.factorToCanonical).toBe(1);
  });

  it('should uppercase a supplied code and keep a blank code as null', () => {
    expect(new CreateUom({ ...valid, code: ' kg ' }).code).toBe('KG');
    expect(new CreateUom({ ...valid, code: '   ' }).code).toBeNull();
    expect(new CreateUom(valid).code).toBeNull();
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when code is not a string', () => {
    expect(() => new CreateUom({ ...valid, code: 123 })).toThrow(
      'CREATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw CODE_INVALID for a malformed code', () => {
    for (const code of ['1KG', 'KG!', 'KODE YANG TERLALU PANJANG SEKALI']) {
      expect(() => new CreateUom({ ...valid, code })).toThrow('CREATE_UOM.CODE_INVALID');
    }
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new CreateUom({ ...valid, name: '' })).toThrow(
      'CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreateUom(null)).toThrow('CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when dimension/factor is missing', () => {
    expect(() => new CreateUom({ name: 'PCS' })).toThrow('CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    expect(() => new CreateUom({ name: 'PCS', dimension: 'COUNT' })).toThrow(
      'CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new CreateUom({ ...valid, name: 123 })).toThrow(
      'CREATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(() => new CreateUom({ ...valid, name: 'a'.repeat(101) })).toThrow(
      'CREATE_UOM.NAME_LIMIT_CHAR',
    );
  });

  it('should accept any well-formed dimension code and normalise it to uppercase', () => {
    const entity = new CreateUom({ ...valid, dimension: ' length ' });
    expect(entity.dimension).toBe('LENGTH');
  });

  it('should throw DIMENSION_INVALID for a malformed dimension code', () => {
    for (const dimension of ['length-dash', '1LENGTH']) {
      expect(() => new CreateUom({ ...valid, dimension })).toThrow('CREATE_UOM.DIMENSION_INVALID');
    }
  });

  it('should throw FACTOR_INVALID when factor is not a positive finite number', () => {
    for (const factorToCanonical of [0, -1, 'x', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new CreateUom({ ...valid, factorToCanonical })).toThrow(
        'CREATE_UOM.FACTOR_INVALID',
      );
    }
  });

  it('should throw FACTOR_BELOW_CANONICAL when factor is between 0 and 1', () => {
    expect(() => new CreateUom({ ...valid, factorToCanonical: 0.5 })).toThrow(
      'CREATE_UOM.FACTOR_BELOW_CANONICAL',
    );
  });
});
