import { ProductUomConversion } from '../entities/ProductUomConversion';

const now = new Date();

const base = {
  id: 'conv-uuid',
  companyId: 'company-uuid',
  productId: 'prod-uuid',
  uomId: 'alt-uom-uuid',
  factorToBase: '25000',
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe('ProductUomConversion entity', () => {
  it('should coerce factorToBase to a number and default uom display to null', () => {
    const entity = new ProductUomConversion(base);
    expect(entity.factorToBase).toBe(25000);
    expect(typeof entity.factorToBase).toBe('number');
    expect(entity.uomCode).toBeNull();
    expect(entity.uomName).toBeNull();
  });

  it('should carry optional uom display fields when provided', () => {
    const entity = new ProductUomConversion({ ...base, uomCode: 'UOM-050', uomName: 'Karung' });
    expect(entity.uomCode).toBe('UOM-050');
    expect(entity.uomName).toBe('Karung');
  });

  it('should throw when a required property is missing', () => {
    expect(() => new ProductUomConversion({ ...base, productId: '' })).toThrow(
      'PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
