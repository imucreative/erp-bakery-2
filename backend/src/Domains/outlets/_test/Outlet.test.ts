import { Outlet } from '../entities/Outlet';

const validPayload = {
  id: 'outlet-uuid',
  companyId: 'company-uuid',
  code: 'OUT-001',
  name: 'Outlet Sudirman',
  address: 'Jl. Sudirman',
  phone: '021-1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Outlet', () => {
  it('should create entity with correct properties', () => {
    const outlet = new Outlet(validPayload);

    expect(outlet.id).toBe('outlet-uuid');
    expect(outlet.companyId).toBe('company-uuid');
    expect(outlet.code).toBe('OUT-001');
    expect(outlet.name).toBe('Outlet Sudirman');
    expect(outlet.isActive).toBe(true);
  });

  it('should default address and phone to null when omitted', () => {
    const outlet = new Outlet({ ...validPayload, address: undefined, phone: undefined });

    expect(outlet.address).toBeNull();
    expect(outlet.phone).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when id is missing', () => {
    expect(() => new Outlet({ ...validPayload, id: '' })).toThrow(
      'OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when companyId is missing', () => {
    expect(() => new Outlet({ ...validPayload, companyId: '' })).toThrow(
      'OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(() => new Outlet({ ...validPayload, code: '' })).toThrow(
      'OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
