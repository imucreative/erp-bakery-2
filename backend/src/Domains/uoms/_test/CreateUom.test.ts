import { CreateUom } from '../entities/CreateUom';

describe('CreateUom', () => {
  it('should create entity with trimmed name', () => {
    const entity = new CreateUom({ name: '  PCS  ' });
    expect(entity.name).toBe('PCS');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new CreateUom({ name: '' })).toThrow('CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreateUom(null)).toThrow('CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new CreateUom({ name: 123 })).toThrow(
      'CREATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(() => new CreateUom({ name: 'a'.repeat(101) })).toThrow('CREATE_UOM.NAME_LIMIT_CHAR');
  });
});
