import { UpdateProductType } from '../entities/UpdateProductType';

describe('UpdateProductType', () => {
  it('should return only provided fields', () => {
    expect(new UpdateProductType({ name: 'Barang Jadi' }).fields).toEqual({
      name: 'Barang Jadi',
    });
  });

  it('should normalise description and allow null/empty to clear it', () => {
    expect(new UpdateProductType({ description: '  Teks  ' }).fields.description).toBe('Teks');
    expect(new UpdateProductType({ description: null }).fields.description).toBeNull();
    expect(new UpdateProductType({ description: '   ' }).fields.description).toBeNull();
  });

  it('should keep sortOrder and isActive', () => {
    expect(new UpdateProductType({ sortOrder: 10, isActive: false }).fields).toEqual({
      sortOrder: 10,
      isActive: false,
    });
  });

  it('should throw when no updatable field is present', () => {
    expect(() => new UpdateProductType({})).toThrow(
      'UPDATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(() => new UpdateProductType(null)).toThrow(
      'UPDATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw when name is empty or too long', () => {
    expect(() => new UpdateProductType({ name: '   ' })).toThrow(
      'UPDATE_PRODUCT_TYPE.NAME_LIMIT_CHAR',
    );
    expect(() => new UpdateProductType({ name: 'x'.repeat(101) })).toThrow(
      'UPDATE_PRODUCT_TYPE.NAME_LIMIT_CHAR',
    );
  });

  it('should throw when description is too long', () => {
    expect(() => new UpdateProductType({ description: 'x'.repeat(501) })).toThrow(
      'UPDATE_PRODUCT_TYPE.DESCRIPTION_LIMIT_CHAR',
    );
  });

  it('should throw when sortOrder is invalid', () => {
    expect(() => new UpdateProductType({ sortOrder: -1 })).toThrow(
      'UPDATE_PRODUCT_TYPE.SORT_ORDER_INVALID',
    );
    expect(() => new UpdateProductType({ sortOrder: 1.5 })).toThrow(
      'UPDATE_PRODUCT_TYPE.SORT_ORDER_INVALID',
    );
  });

  it('should throw when a field has the wrong type', () => {
    expect(() => new UpdateProductType({ name: 123 })).toThrow(
      'UPDATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
    expect(() => new UpdateProductType({ sortOrder: '10' })).toThrow(
      'UPDATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
    expect(() => new UpdateProductType({ isActive: 'yes' })).toThrow(
      'UPDATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });
});
