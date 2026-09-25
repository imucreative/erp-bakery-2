import { CreateProduct } from '../entities/CreateProduct';

const valid = {
  sku: 'SKU-001',
  name: 'Roti Tawar',
  productGroupId: 'pg-uuid',
  categoryId: 'cat-uuid',
  uomId: 'uom-uuid',
  supplierId: 'sup-uuid',
  productType: 'FINISHED_GOODS',
};

describe('CreateProduct', () => {
  it('should create entity with trimmed values and defaults', () => {
    const entity = new CreateProduct({ ...valid, sku: '  SKU-001  ', name: '  Roti  ' });
    expect(entity.sku).toBe('SKU-001');
    expect(entity.name).toBe('Roti');
    expect(entity.barcode).toBeNull();
    expect(entity.purchasePrice).toBe(0);
    expect(entity.sellingPrice).toBe(0);
    expect(entity.minimumStock).toBe(0);
    expect(entity.shelfLifeDays).toBe(0);
    expect(entity.isBatchTracked).toBe(true);
  });

  it('should keep provided numeric and boolean fields', () => {
    const entity = new CreateProduct({
      ...valid,
      barcode: '899',
      purchasePrice: 5000,
      sellingPrice: 12000,
      minimumStock: 10,
      shelfLifeDays: 3,
      isBatchTracked: false,
    });
    expect(entity.barcode).toBe('899');
    expect(entity.purchasePrice).toBe(5000);
    expect(entity.isBatchTracked).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when sku is missing', () => {
    expect(() => new CreateProduct({ ...valid, sku: '' })).toThrow(
      'CREATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreateProduct(null)).toThrow(
      'CREATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when a required field is not a string', () => {
    expect(() => new CreateProduct({ ...valid, uomId: 123 })).toThrow(
      'CREATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw SKU_LIMIT_CHAR when sku exceeds 50 characters', () => {
    expect(() => new CreateProduct({ ...valid, sku: 'a'.repeat(51) })).toThrow(
      'CREATE_PRODUCT.SKU_LIMIT_CHAR',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 150 characters', () => {
    expect(() => new CreateProduct({ ...valid, name: 'a'.repeat(151) })).toThrow(
      'CREATE_PRODUCT.NAME_LIMIT_CHAR',
    );
  });

  it('should throw BARCODE_LIMIT_CHAR when barcode exceeds 50 characters', () => {
    expect(() => new CreateProduct({ ...valid, barcode: 'a'.repeat(51) })).toThrow(
      'CREATE_PRODUCT.BARCODE_LIMIT_CHAR',
    );
  });

  it('should throw INVALID_PRODUCT_TYPE for an unknown type', () => {
    expect(() => new CreateProduct({ ...valid, productType: 'UNKNOWN' })).toThrow(
      'CREATE_PRODUCT.INVALID_PRODUCT_TYPE',
    );
  });

  it('should throw INVALID_PRICE when a price is negative', () => {
    expect(() => new CreateProduct({ ...valid, sellingPrice: -1 })).toThrow(
      'CREATE_PRODUCT.INVALID_PRICE',
    );
  });

  it('should throw INVALID_PRICE when a price is not a number', () => {
    expect(() => new CreateProduct({ ...valid, purchasePrice: 'abc' })).toThrow(
      'CREATE_PRODUCT.INVALID_PRICE',
    );
  });

  it('should throw INVALID_SHELF_LIFE when shelf life is not an integer', () => {
    expect(() => new CreateProduct({ ...valid, shelfLifeDays: 1.5 })).toThrow(
      'CREATE_PRODUCT.INVALID_SHELF_LIFE',
    );
  });
});
