import { UpdateProductGroup } from '../entities/UpdateProductGroup';

describe('UpdateProductGroup', () => {
  it('should return only provided fields', () => {
    const entity = new UpdateProductGroup({ name: 'Roti' });
    expect(entity.fields).toEqual({ name: 'Roti' });
  });

  it('should trim name and description', () => {
    const entity = new UpdateProductGroup({ name: '  Roti  ', description: '  d  ' });
    expect(entity.fields.name).toBe('Roti');
    expect(entity.fields.description).toBe('d');
  });

  it('should allow setting description to null', () => {
    const entity = new UpdateProductGroup({ description: null });
    expect(entity.fields.description).toBeNull();
  });

  it('should coerce isActive to boolean', () => {
    const entity = new UpdateProductGroup({ isActive: false });
    expect(entity.fields.isActive).toBe(false);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when no updatable field is present', () => {
    expect(() => new UpdateProductGroup({})).toThrow(
      'UPDATE_PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new UpdateProductGroup(null)).toThrow(
      'UPDATE_PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new UpdateProductGroup({ name: 123 })).toThrow(
      'UPDATE_PRODUCT_GROUP.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when isActive is not a boolean', () => {
    expect(() => new UpdateProductGroup({ isActive: 'yes' })).toThrow(
      'UPDATE_PRODUCT_GROUP.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name is empty after trim', () => {
    expect(() => new UpdateProductGroup({ name: '   ' })).toThrow(
      'UPDATE_PRODUCT_GROUP.NAME_LIMIT_CHAR',
    );
  });

  it('should throw DESCRIPTION_LIMIT_CHAR when description exceeds 500 characters', () => {
    expect(() => new UpdateProductGroup({ description: 'a'.repeat(501) })).toThrow(
      'UPDATE_PRODUCT_GROUP.DESCRIPTION_LIMIT_CHAR',
    );
  });
});
