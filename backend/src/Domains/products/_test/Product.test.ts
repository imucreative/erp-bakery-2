import { Product } from '../entities/Product';

const valid = {
  id: 'prod-uuid',
  companyId: 'company-uuid',
  sku: 'SKU-001',
  barcode: null,
  name: 'Roti Tawar',
  productGroupId: 'pg-uuid',
  categoryId: 'cat-uuid',
  uomId: 'uom-uuid',
  supplierId: 'sup-uuid',
  productType: 'FINISHED_GOODS',
  purchasePrice: '5000',
  sellingPrice: '12000',
  minimumStock: '10',
  shelfLifeDays: 3,
  isBatchTracked: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Product', () => {
  it('should create entity and coerce numeric strings to numbers', () => {
    const entity = new Product(valid);
    expect(entity.sku).toBe('SKU-001');
    expect(entity.purchasePrice).toBe(5000);
    expect(entity.sellingPrice).toBe(12000);
    expect(entity.minimumStock).toBe(10);
    expect(entity.shelfLifeDays).toBe(3);
  });

  it('should default barcode to null', () => {
    const entity = new Product(valid);
    expect(entity.barcode).toBeNull();
  });

  it('should keep provided barcode', () => {
    const entity = new Product({ ...valid, barcode: '899' });
    expect(entity.barcode).toBe('899');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when sku is missing', () => {
    expect(() => new Product({ ...valid, sku: '' })).toThrow(
      'PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when categoryId is missing', () => {
    expect(() => new Product({ ...valid, categoryId: '' })).toThrow(
      'PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
