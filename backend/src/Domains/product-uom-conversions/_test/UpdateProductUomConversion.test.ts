import { UpdateProductUomConversion } from '../entities/UpdateProductUomConversion';

describe('UpdateProductUomConversion entity', () => {
  it('should collect only provided updatable fields', () => {
    const entity = new UpdateProductUomConversion({ factorToBase: 30000 });
    expect(entity.fields).toEqual({ factorToBase: 30000 });
  });

  it('should collect both factor and isActive', () => {
    const entity = new UpdateProductUomConversion({ factorToBase: 10, isActive: false });
    expect(entity.fields).toEqual({ factorToBase: 10, isActive: false });
  });

  it('should throw when no updatable field is present', () => {
    expect(() => new UpdateProductUomConversion({})).toThrow(
      'UPDATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw when factorToBase is not numeric', () => {
    expect(() => new UpdateProductUomConversion({ factorToBase: '10' })).toThrow(
      'UPDATE_PRODUCT_UOM_CONVERSION.FACTOR_NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw when factorToBase <= 0', () => {
    expect(() => new UpdateProductUomConversion({ factorToBase: 0 })).toThrow(
      'UPDATE_PRODUCT_UOM_CONVERSION.FACTOR_MUST_BE_POSITIVE',
    );
  });

  it('should throw when isActive is not a boolean', () => {
    expect(() => new UpdateProductUomConversion({ isActive: 1 })).toThrow(
      'UPDATE_PRODUCT_UOM_CONVERSION.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });
});
