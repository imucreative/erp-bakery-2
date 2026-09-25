import { UpdateProduct } from '../entities/UpdateProduct';

describe('UpdateProduct', () => {
  it('should return only provided fields', () => {
    expect(new UpdateProduct({ name: 'Roti Baru' }).fields).toEqual({ name: 'Roti Baru' });
  });

  it('should allow nulling barcode', () => {
    const entity = new UpdateProduct({ barcode: null });
    expect(entity.fields.barcode).toBeNull();
  });

  it('should coerce isActive to boolean', () => {
    expect(new UpdateProduct({ isActive: false }).fields.isActive).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when no updatable field is present', () => {
    expect(() => new UpdateProduct({})).toThrow('UPDATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new UpdateProduct(null)).toThrow('UPDATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should ignore immutable fields (sku, productGroupId)', () => {
    const entity = new UpdateProduct({ name: 'X', sku: 'OTHER', productGroupId: 'other' });
    expect(entity.fields).toEqual({ name: 'X' });
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when isActive is not a boolean', () => {
    expect(() => new UpdateProduct({ isActive: 'yes' })).toThrow(
      'UPDATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name is empty after trim', () => {
    expect(() => new UpdateProduct({ name: '  ' })).toThrow('UPDATE_PRODUCT.NAME_LIMIT_CHAR');
  });

  it('should throw INVALID_PRODUCT_TYPE for an unknown type', () => {
    expect(() => new UpdateProduct({ productType: 'BAD' })).toThrow(
      'UPDATE_PRODUCT.INVALID_PRODUCT_TYPE',
    );
  });

  it('should throw INVALID_PRICE when a price is negative', () => {
    expect(() => new UpdateProduct({ sellingPrice: -5 })).toThrow(
      'UPDATE_PRODUCT.INVALID_PRICE',
    );
  });

  it('should throw INVALID_SHELF_LIFE when shelf life is not an integer', () => {
    expect(() => new UpdateProduct({ shelfLifeDays: 2.5 })).toThrow(
      'UPDATE_PRODUCT.INVALID_SHELF_LIFE',
    );
  });
});
