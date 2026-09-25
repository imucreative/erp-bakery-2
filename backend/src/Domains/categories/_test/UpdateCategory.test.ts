import { UpdateCategory } from '../entities/UpdateCategory';

describe('UpdateCategory', () => {
  it('should return only provided fields', () => {
    expect(new UpdateCategory({ name: 'Roti Baru' }).fields).toEqual({ name: 'Roti Baru' });
  });

  it('should allow nulling description', () => {
    const entity = new UpdateCategory({ description: null });
    expect(entity.fields.description).toBeNull();
  });

  it('should coerce isActive to boolean', () => {
    expect(new UpdateCategory({ isActive: false }).fields.isActive).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when no updatable field is present', () => {
    expect(() => new UpdateCategory({})).toThrow('UPDATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new UpdateCategory(null)).toThrow(
      'UPDATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when isActive is not a boolean', () => {
    expect(() => new UpdateCategory({ isActive: 'yes' })).toThrow(
      'UPDATE_CATEGORY.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name is empty after trim', () => {
    expect(() => new UpdateCategory({ name: '  ' })).toThrow('UPDATE_CATEGORY.NAME_LIMIT_CHAR');
  });

  it('should throw DESCRIPTION_LIMIT_CHAR when description exceeds 500 characters', () => {
    expect(() => new UpdateCategory({ description: 'a'.repeat(501) })).toThrow(
      'UPDATE_CATEGORY.DESCRIPTION_LIMIT_CHAR',
    );
  });

  it('should ignore productGroupId (immutable after creation)', () => {
    const entity = new UpdateCategory({ name: 'X', productGroupId: 'other' });
    expect(entity.fields).toEqual({ name: 'X' });
  });
});
