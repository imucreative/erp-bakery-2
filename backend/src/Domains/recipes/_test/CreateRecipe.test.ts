import { CreateRecipe } from '../entities/CreateRecipe';

const validItem = {
  ingredientProductId: 'ingredient-1',
  qty: 500,
  uomId: 'uom-1',
  lossPercentage: 5,
};

const validPayload = {
  name: 'Roti Tawar',
  productId: 'finished-1',
  yieldQty: 20,
  yieldUomId: 'uom-pcs',
  instructions: 'Mix and bake',
  items: [validItem],
};

describe('CreateRecipe', () => {
  it('should build entity with normalized fields', () => {
    const e = new CreateRecipe(validPayload);
    expect(e.name).toBe('Roti Tawar');
    expect(e.productId).toBe('finished-1');
    expect(e.yieldQty).toBe(20);
    expect(e.items).toHaveLength(1);
    expect(e.items[0].lossPercentage).toBe(5);
  });

  it('should default lossPercentage to 0 when absent', () => {
    const e = new CreateRecipe({
      ...validPayload,
      items: [{ ingredientProductId: 'i', qty: 1, uomId: 'u' }],
    });
    expect(e.items[0].lossPercentage).toBe(0);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name missing', () => {
    expect(() => new CreateRecipe({ ...validPayload, name: '' })).toThrow(
      'CREATE_RECIPE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw YIELD_MUST_BE_POSITIVE for zero yield', () => {
    expect(() => new CreateRecipe({ ...validPayload, yieldQty: 0 })).toThrow(
      'CREATE_RECIPE.YIELD_MUST_BE_POSITIVE',
    );
  });

  it('should throw YIELD_NOT_MEET_DATA_TYPE_SPECIFICATION for non-number yield', () => {
    expect(() => new CreateRecipe({ ...validPayload, yieldQty: 'x' })).toThrow(
      'CREATE_RECIPE.YIELD_NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw ITEMS_REQUIRED when items empty', () => {
    expect(() => new CreateRecipe({ ...validPayload, items: [] })).toThrow(
      'CREATE_RECIPE.ITEMS_REQUIRED',
    );
  });

  it('should throw ITEM_QTY_MUST_BE_POSITIVE for zero item qty', () => {
    expect(
      () => new CreateRecipe({ ...validPayload, items: [{ ...validItem, qty: 0 }] }),
    ).toThrow('CREATE_RECIPE.ITEM_QTY_MUST_BE_POSITIVE');
  });

  it('should throw ITEM_LOSS_OUT_OF_RANGE when loss > 100', () => {
    expect(
      () => new CreateRecipe({ ...validPayload, items: [{ ...validItem, lossPercentage: 150 }] }),
    ).toThrow('CREATE_RECIPE.ITEM_LOSS_OUT_OF_RANGE');
  });

  it('should throw INGREDIENT_IS_FINISHED_PRODUCT when ingredient equals product', () => {
    expect(
      () =>
        new CreateRecipe({
          ...validPayload,
          items: [{ ...validItem, ingredientProductId: 'finished-1' }],
        }),
    ).toThrow('CREATE_RECIPE.INGREDIENT_IS_FINISHED_PRODUCT');
  });

  it('should throw DUPLICATE_INGREDIENT for repeated ingredient', () => {
    expect(
      () => new CreateRecipe({ ...validPayload, items: [validItem, { ...validItem }] }),
    ).toThrow('CREATE_RECIPE.DUPLICATE_INGREDIENT');
  });
});
