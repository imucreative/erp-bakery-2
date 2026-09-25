import { CreateCategory } from '../entities/CreateCategory';

describe('CreateCategory', () => {
  it('should create entity with trimmed values', () => {
    const entity = new CreateCategory({
      productGroupId: '  pg-uuid  ',
      name: '  Roti Manis  ',
      description: '  Kategori roti  ',
    });
    expect(entity.productGroupId).toBe('pg-uuid');
    expect(entity.name).toBe('Roti Manis');
    expect(entity.description).toBe('Kategori roti');
  });

  it('should default description to null', () => {
    const entity = new CreateCategory({ productGroupId: 'pg-uuid', name: 'Roti' });
    expect(entity.description).toBeNull();
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new CreateCategory({ productGroupId: 'pg-uuid', name: '' })).toThrow(
      'CREATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when productGroupId is missing', () => {
    expect(() => new CreateCategory({ name: 'Roti' })).toThrow(
      'CREATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreateCategory(null)).toThrow(
      'CREATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new CreateCategory({ productGroupId: 'pg-uuid', name: 123 })).toThrow(
      'CREATE_CATEGORY.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when description is not a string', () => {
    expect(
      () => new CreateCategory({ productGroupId: 'pg-uuid', name: 'Roti', description: 123 }),
    ).toThrow('CREATE_CATEGORY.NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(() => new CreateCategory({ productGroupId: 'pg-uuid', name: 'a'.repeat(101) })).toThrow(
      'CREATE_CATEGORY.NAME_LIMIT_CHAR',
    );
  });

  it('should throw DESCRIPTION_LIMIT_CHAR when description exceeds 500 characters', () => {
    expect(
      () =>
        new CreateCategory({
          productGroupId: 'pg-uuid',
          name: 'Roti',
          description: 'a'.repeat(501),
        }),
    ).toThrow('CREATE_CATEGORY.DESCRIPTION_LIMIT_CHAR');
  });
});
