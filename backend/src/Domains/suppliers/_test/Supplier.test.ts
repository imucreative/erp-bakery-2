import { Supplier } from '../entities/Supplier';

const valid = {
  id: 'sup-uuid',
  companyId: 'company-uuid',
  code: 'SUP-001',
  name: 'PT Tepung',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Supplier', () => {
  it('should create entity and default optional fields to null', () => {
    const entity = new Supplier(valid);
    expect(entity.code).toBe('SUP-001');
    expect(entity.address).toBeNull();
    expect(entity.picName).toBeNull();
  });

  it('should keep provided picName', () => {
    const entity = new Supplier({ ...valid, picName: 'Budi' });
    expect(entity.picName).toBe('Budi');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(() => new Supplier({ ...valid, code: '' })).toThrow(
      'SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new Supplier({ ...valid, name: '' })).toThrow(
      'SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
