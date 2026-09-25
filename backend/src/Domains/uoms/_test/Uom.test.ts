import { Uom } from '../entities/Uom';

const valid = {
  id: 'uom-uuid',
  companyId: 'company-uuid',
  code: 'UOM-001',
  name: 'PCS',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Uom', () => {
  it('should create entity with correct properties', () => {
    const entity = new Uom(valid);
    expect(entity.code).toBe('UOM-001');
    expect(entity.name).toBe('PCS');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(() => new Uom({ ...valid, code: '' })).toThrow('UOM.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new Uom({ ...valid, name: '' })).toThrow('UOM.NOT_CONTAIN_NEEDED_PROPERTY');
  });
});
