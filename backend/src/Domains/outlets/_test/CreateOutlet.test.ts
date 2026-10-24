import { CreateOutlet } from '../entities/CreateOutlet';

describe('CreateOutlet', () => {
  it('should create entity with correct properties', () => {
    const entity = new CreateOutlet({
      name: 'Outlet Sudirman',
      address: 'Jl. Sudirman No. 1',
      phone: '021-555-0100',
    });

    expect(entity.name).toBe('Outlet Sudirman');
    expect(entity.address).toBe('Jl. Sudirman No. 1');
    expect(entity.phone).toBe('021-555-0100');
  });

  it('should trim whitespace on name, address, and phone', () => {
    const entity = new CreateOutlet({
      name: '  Outlet A  ',
      address: '  Jl. A  ',
      phone: '  021  ',
    });

    expect(entity.name).toBe('Outlet A');
    expect(entity.address).toBe('Jl. A');
    expect(entity.phone).toBe('021');
  });

  it('should default address and phone to null when omitted', () => {
    const entity = new CreateOutlet({ name: 'Outlet A' });

    expect(entity.address).toBeNull();
    expect(entity.phone).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreateOutlet(null)).toThrow(
      'CREATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new CreateOutlet({ name: '' })).toThrow(
      'CREATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new CreateOutlet({ name: 123 })).toThrow(
      'CREATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when phone is not a string', () => {
    expect(() => new CreateOutlet({ name: 'A', phone: 123 })).toThrow(
      'CREATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(() => new CreateOutlet({ name: 'a'.repeat(101) })).toThrow(
      'CREATE_OUTLET.NAME_LIMIT_CHAR',
    );
  });

  it('should throw PHONE_LIMIT_CHAR when phone exceeds 30 characters', () => {
    expect(() => new CreateOutlet({ name: 'A', phone: '1'.repeat(31) })).toThrow(
      'CREATE_OUTLET.PHONE_LIMIT_CHAR',
    );
  });

  it('should default code to null when omitted or blank', () => {
    expect(new CreateOutlet({ name: 'Outlet A' }).code).toBeNull();
    expect(new CreateOutlet({ name: 'Outlet A', code: '   ' }).code).toBeNull();
    expect(new CreateOutlet({ name: 'Outlet A', code: null }).code).toBeNull();
  });

  it('should trim and uppercase a supplied code', () => {
    const entity = new CreateOutlet({ name: 'Outlet A', code: '  out-bdg-01  ' });

    expect(entity.code).toBe('OUT-BDG-01');
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when code is not a string', () => {
    expect(() => new CreateOutlet({ name: 'A', code: 123 })).toThrow(
      'CREATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw CODE_LIMIT_CHAR when code exceeds 20 characters', () => {
    expect(() => new CreateOutlet({ name: 'A', code: 'X'.repeat(21) })).toThrow(
      'CREATE_OUTLET.CODE_LIMIT_CHAR',
    );
  });
});
