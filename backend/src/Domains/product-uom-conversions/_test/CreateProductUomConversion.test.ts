import { CreateProductUomConversion } from '../entities/CreateProductUomConversion';

describe('CreateProductUomConversion entity', () => {
  it('should normalise a valid payload (default isActive = true)', () => {
    const entity = new CreateProductUomConversion({ uomId: '  alt-uom  ', factorToBase: 25000 });
    expect(entity.uomId).toBe('alt-uom');
    expect(entity.factorToBase).toBe(25000);
    expect(entity.isActive).toBe(true);
  });

  it('should accept non-integer factor and explicit isActive=false', () => {
    const entity = new CreateProductUomConversion({
      uomId: 'alt-uom',
      factorToBase: 0.5,
      isActive: false,
    });
    expect(entity.factorToBase).toBe(0.5);
    expect(entity.isActive).toBe(false);
  });

  it('should throw when uomId is missing', () => {
    expect(() => new CreateProductUomConversion({ factorToBase: 1 })).toThrow(
      'CREATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw when factorToBase is missing', () => {
    expect(() => new CreateProductUomConversion({ uomId: 'alt-uom' })).toThrow(
      'CREATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw when uomId is not a string', () => {
    expect(() => new CreateProductUomConversion({ uomId: 123, factorToBase: 1 })).toThrow(
      'CREATE_PRODUCT_UOM_CONVERSION.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw when factorToBase is not numeric', () => {
    expect(() => new CreateProductUomConversion({ uomId: 'alt', factorToBase: '25000' })).toThrow(
      'CREATE_PRODUCT_UOM_CONVERSION.FACTOR_NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw when factorToBase <= 0', () => {
    expect(() => new CreateProductUomConversion({ uomId: 'alt', factorToBase: 0 })).toThrow(
      'CREATE_PRODUCT_UOM_CONVERSION.FACTOR_MUST_BE_POSITIVE',
    );
    expect(() => new CreateProductUomConversion({ uomId: 'alt', factorToBase: -1 })).toThrow(
      'CREATE_PRODUCT_UOM_CONVERSION.FACTOR_MUST_BE_POSITIVE',
    );
  });

  it('should throw when isActive is not a boolean', () => {
    expect(
      () => new CreateProductUomConversion({ uomId: 'alt', factorToBase: 1, isActive: 'yes' }),
    ).toThrow('CREATE_PRODUCT_UOM_CONVERSION.NOT_MEET_DATA_TYPE_SPECIFICATION');
  });
});
