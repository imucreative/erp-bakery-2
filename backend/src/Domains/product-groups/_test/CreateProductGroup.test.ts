import { CreateProductGroup } from '../entities/CreateProductGroup';

describe('CreateProductGroup', () => {
  const valid = { name: 'Bahan Baku', description: 'Kelompok bahan baku' };

  it('should create entity with correct properties', () => {
    const entity = new CreateProductGroup(valid);
    expect(entity.name).toBe('Bahan Baku');
    expect(entity.description).toBe('Kelompok bahan baku');
  });

  it('should trim name and description', () => {
    const entity = new CreateProductGroup({ name: '  Roti  ', description: '  desc  ' });
    expect(entity.name).toBe('Roti');
    expect(entity.description).toBe('desc');
  });

  it('should default description to null when omitted', () => {
    const entity = new CreateProductGroup({ name: 'Roti' });
    expect(entity.description).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new CreateProductGroup({ name: '' })).toThrow(
      'CREATE_PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreateProductGroup(null)).toThrow(
      'CREATE_PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new CreateProductGroup({ name: 123 })).toThrow(
      'CREATE_PRODUCT_GROUP.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when description is not a string', () => {
    expect(() => new CreateProductGroup({ name: 'Roti', description: 123 })).toThrow(
      'CREATE_PRODUCT_GROUP.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(() => new CreateProductGroup({ name: 'a'.repeat(101) })).toThrow(
      'CREATE_PRODUCT_GROUP.NAME_LIMIT_CHAR',
    );
  });

  it('should throw DESCRIPTION_LIMIT_CHAR when description exceeds 500 characters', () => {
    expect(
      () => new CreateProductGroup({ name: 'Roti', description: 'a'.repeat(501) }),
    ).toThrow('CREATE_PRODUCT_GROUP.DESCRIPTION_LIMIT_CHAR');
  });
});
