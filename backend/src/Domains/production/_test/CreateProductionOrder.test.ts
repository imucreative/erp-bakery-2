import { CreateProductionOrder } from '../entities/CreateProductionOrder';

const base = {
  outletId: 'outlet-1',
  recipeId: 'recipe-1',
  scheduledQty: 40,
};

describe('CreateProductionOrder', () => {
  it('should construct with a valid payload (recipeId)', () => {
    const o = new CreateProductionOrder(base);
    expect(o.outletId).toBe('outlet-1');
    expect(o.recipeId).toBe('recipe-1');
    expect(o.productId).toBeNull();
    expect(o.scheduledQty).toBe(40);
  });

  it('should accept productId instead of recipeId', () => {
    const o = new CreateProductionOrder({ outletId: 'outlet-1', productId: 'p1', scheduledQty: 5 });
    expect(o.productId).toBe('p1');
    expect(o.recipeId).toBeNull();
  });

  it('should reject when both recipeId and productId are missing', () => {
    expect(() => new CreateProductionOrder({ outletId: 'outlet-1', scheduledQty: 5 })).toThrow(
      'CREATE_PRODUCTION_ORDER.RECIPE_OR_PRODUCT_REQUIRED',
    );
  });

  it('should reject when outletId missing', () => {
    expect(() => new CreateProductionOrder({ recipeId: 'r', scheduledQty: 5 })).toThrow(
      'CREATE_PRODUCTION_ORDER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should reject non-numeric qty', () => {
    expect(
      () => new CreateProductionOrder({ ...base, scheduledQty: 'lots' as unknown as number }),
    ).toThrow('CREATE_PRODUCTION_ORDER.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should reject non-positive qty', () => {
    expect(() => new CreateProductionOrder({ ...base, scheduledQty: 0 })).toThrow(
      'CREATE_PRODUCTION_ORDER.QTY_MUST_BE_POSITIVE',
    );
  });

  it('should reject a non-object payload', () => {
    expect(() => new CreateProductionOrder(null)).toThrow(
      'CREATE_PRODUCTION_ORDER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
