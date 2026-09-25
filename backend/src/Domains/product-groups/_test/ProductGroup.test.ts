import { ProductGroup } from '../entities/ProductGroup';

const valid = {
  id: 'pg-uuid',
  companyId: 'company-uuid',
  code: 'PG-001',
  name: 'Bahan Baku',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProductGroup', () => {
  it('should create entity with correct properties', () => {
    const entity = new ProductGroup(valid);
    expect(entity.id).toBe('pg-uuid');
    expect(entity.code).toBe('PG-001');
    expect(entity.description).toBeNull();
  });

  it('should keep provided description', () => {
    const entity = new ProductGroup({ ...valid, description: 'desc' });
    expect(entity.description).toBe('desc');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when id is missing', () => {
    expect(() => new ProductGroup({ ...valid, id: '' })).toThrow(
      'PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(() => new ProductGroup({ ...valid, code: '' })).toThrow(
      'PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new ProductGroup({ ...valid, name: '' })).toThrow(
      'PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
