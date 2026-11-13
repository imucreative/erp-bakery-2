import { CreateProductType } from '../entities/CreateProductType';

const valid = {
  code: 'finished_goods',
  name: '  Barang Jadi  ',
};

describe('CreateProductType', () => {
  it('should normalise code/name and apply defaults', () => {
    const entity = new CreateProductType(valid);

    expect(entity.code).toBe('FINISHED_GOODS');
    expect(entity.name).toBe('Barang Jadi');
    expect(entity.description).toBeNull();
    expect(entity.sortOrder).toBe(0);
    expect(entity.isActive).toBe(true);
  });

  it('should keep provided description/sortOrder/isActive', () => {
    const entity = new CreateProductType({
      ...valid,
      description: '  Produk jadi  ',
      sortOrder: 20,
      isActive: false,
    });

    expect(entity.description).toBe('Produk jadi');
    expect(entity.sortOrder).toBe(20);
    expect(entity.isActive).toBe(false);
  });

  it('should normalise an empty description to null', () => {
    const entity = new CreateProductType({ ...valid, description: '   ' });
    expect(entity.description).toBeNull();
  });

  it('should throw when code or name is missing', () => {
    expect(() => new CreateProductType({ name: 'X' })).toThrow(
      'CREATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(() => new CreateProductType({ code: 'X' })).toThrow(
      'CREATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(() => new CreateProductType(null)).toThrow(
      'CREATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw when code is not a valid uppercase identifier', () => {
    expect(() => new CreateProductType({ ...valid, code: '1ABC' })).toThrow(
      'CREATE_PRODUCT_TYPE.CODE_INVALID',
    );
    expect(() => new CreateProductType({ ...valid, code: 'ABC-DEF' })).toThrow(
      'CREATE_PRODUCT_TYPE.CODE_INVALID',
    );
    expect(() => new CreateProductType({ ...valid, code: `A${'B'.repeat(50)}` })).toThrow(
      'CREATE_PRODUCT_TYPE.CODE_INVALID',
    );
  });

  it('should throw when name is empty or too long', () => {
    expect(() => new CreateProductType({ ...valid, name: '   ' })).toThrow(
      'CREATE_PRODUCT_TYPE.NAME_LIMIT_CHAR',
    );
    expect(() => new CreateProductType({ ...valid, name: 'x'.repeat(101) })).toThrow(
      'CREATE_PRODUCT_TYPE.NAME_LIMIT_CHAR',
    );
  });

  it('should throw when description is too long', () => {
    expect(() =>
      new CreateProductType({ ...valid, description: 'x'.repeat(501) }),
    ).toThrow('CREATE_PRODUCT_TYPE.DESCRIPTION_LIMIT_CHAR');
  });

  it('should throw when sortOrder is invalid', () => {
    expect(() => new CreateProductType({ ...valid, sortOrder: -1 })).toThrow(
      'CREATE_PRODUCT_TYPE.SORT_ORDER_INVALID',
    );
    expect(() => new CreateProductType({ ...valid, sortOrder: 1.5 })).toThrow(
      'CREATE_PRODUCT_TYPE.SORT_ORDER_INVALID',
    );
    expect(() => new CreateProductType({ ...valid, sortOrder: '10' })).toThrow(
      'CREATE_PRODUCT_TYPE.SORT_ORDER_INVALID',
    );
  });

  it('should throw when isActive is not a boolean', () => {
    expect(() => new CreateProductType({ ...valid, isActive: 'yes' })).toThrow(
      'CREATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });
});
