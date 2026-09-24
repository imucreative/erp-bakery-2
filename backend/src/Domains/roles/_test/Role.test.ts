import { Role } from '../entities/Role';

describe('Role', () => {
  it('should create role entity with all properties', () => {
    const role = new Role({
      id: 'uuid-role',
      companyId: 'uuid-company',
      code: 'OWNER',
      name: 'Owner',
      description: 'Full access',
      isActive: true,
    });

    expect(role.id).toBe('uuid-role');
    expect(role.companyId).toBe('uuid-company');
    expect(role.code).toBe('OWNER');
    expect(role.name).toBe('Owner');
    expect(role.description).toBe('Full access');
    expect(role.isActive).toBe(true);
  });

  it('should create role entity with null companyId (platform-level role)', () => {
    const role = new Role({
      id: 'uuid-role',
      companyId: null,
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      isActive: true,
    });

    expect(role.companyId).toBeNull();
    expect(role.description).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when id is missing', () => {
    expect(
      () => new Role({ id: '', companyId: null, code: 'OWNER', name: 'Owner', isActive: true }),
    ).toThrow('ROLE.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(
      () => new Role({ id: 'uuid', companyId: null, code: '', name: 'Owner', isActive: true }),
    ).toThrow('ROLE.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(
      () => new Role({ id: 'uuid', companyId: null, code: 'OWNER', name: '', isActive: true }),
    ).toThrow('ROLE.NOT_CONTAIN_NEEDED_PROPERTY');
  });
});
