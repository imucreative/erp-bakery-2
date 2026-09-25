import { ProductCategory } from '../entities/ProductCategory';

const valid = {
  id: 'cat-uuid',
  companyId: 'company-uuid',
  productGroupId: 'pg-uuid',
  code: 'PC-001',
  name: 'Roti Manis',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProductCategory', () => {
  it('should create entity and default description to null', () => {
    const entity = new ProductCategory(valid);
    expect(entity.code).toBe('PC-001');
    expect(entity.productGroupId).toBe('pg-uuid');
    expect(entity.description).toBeNull();
  });

  it('should keep provided description', () => {
    const entity = new ProductCategory({ ...valid, description: 'Kategori roti' });
    expect(entity.description).toBe('Kategori roti');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(() => new ProductCategory({ ...valid, code: '' })).toThrow(
      'CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when productGroupId is missing', () => {
    expect(() => new ProductCategory({ ...valid, productGroupId: '' })).toThrow(
      'CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new ProductCategory({ ...valid, name: '' })).toThrow(
      'CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
