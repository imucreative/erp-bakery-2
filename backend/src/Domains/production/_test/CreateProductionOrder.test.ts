import { CreateProductionOrder } from '../entities/CreateProductionOrder';

const base = {
  outletId: 'outlet-1',
  recipeId: 'recipe-1',
  scheduledQty: 40,
  actualQty: 38,
  wasteQty: 2,
  resultExpiredDate: '2026-10-05',
};

describe('CreateProductionOrder (instant-complete)', () => {
  it('should construct with a valid payload (recipeId)', () => {
    const o = new CreateProductionOrder(base);
    expect(o.outletId).toBe('outlet-1');
    expect(o.recipeId).toBe('recipe-1');
    expect(o.productId).toBeNull();
    expect(o.scheduledQty).toBe(40);
    expect(o.actualQty).toBe(38);
    expect(o.wasteQty).toBe(2);
    expect(o.resultExpiredDate).toBe('2026-10-05');
  });

  it('should accept productId instead of recipeId', () => {
    const o = new CreateProductionOrder({
      outletId: 'outlet-1',
      productId: 'p1',
      scheduledQty: 5,
      actualQty: 5,
      resultExpiredDate: '2026-10-05',
    });
    expect(o.productId).toBe('p1');
    expect(o.recipeId).toBeNull();
  });

  it('should default wasteQty to 0 when omitted', () => {
    const o = new CreateProductionOrder({
      outletId: 'outlet-1',
      recipeId: 'recipe-1',
      scheduledQty: 10,
      actualQty: 10,
      resultExpiredDate: '2026-10-05',
    });
    expect(o.wasteQty).toBe(0);
  });

  it('should allow actualQty = 0 with no result expiry (everything wasted)', () => {
    const o = new CreateProductionOrder({
      outletId: 'outlet-1',
      recipeId: 'recipe-1',
      scheduledQty: 10,
      actualQty: 0,
      wasteQty: 10,
    });
    expect(o.actualQty).toBe(0);
    expect(o.resultExpiredDate).toBeNull();
  });

  it('should reject when both recipeId and productId are missing', () => {
    expect(
      () => new CreateProductionOrder({ outletId: 'outlet-1', scheduledQty: 5, actualQty: 5 }),
    ).toThrow('CREATE_PRODUCTION_ORDER.RECIPE_OR_PRODUCT_REQUIRED');
  });

  it('should reject when outletId missing', () => {
    expect(() => new CreateProductionOrder({ recipeId: 'r', scheduledQty: 5, actualQty: 5 })).toThrow(
      'CREATE_PRODUCTION_ORDER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should reject non-numeric scheduledQty', () => {
    expect(
      () => new CreateProductionOrder({ ...base, scheduledQty: 'lots' as unknown as number }),
    ).toThrow('CREATE_PRODUCTION_ORDER.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should reject non-positive scheduledQty', () => {
    expect(() => new CreateProductionOrder({ ...base, scheduledQty: 0 })).toThrow(
      'CREATE_PRODUCTION_ORDER.QTY_MUST_BE_POSITIVE',
    );
  });

  it('should reject missing actualQty', () => {
    const { actualQty: _omit, ...noActual } = base;
    expect(() => new CreateProductionOrder(noActual)).toThrow(
      'CREATE_PRODUCTION_ORDER.ACTUAL_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should reject negative actualQty', () => {
    expect(() => new CreateProductionOrder({ ...base, actualQty: -1 })).toThrow(
      'CREATE_PRODUCTION_ORDER.ACTUAL_QTY_NEGATIVE',
    );
  });

  it('should reject negative wasteQty', () => {
    expect(() => new CreateProductionOrder({ ...base, wasteQty: -1 })).toThrow(
      'CREATE_PRODUCTION_ORDER.WASTE_INVALID',
    );
  });

  it('should require result expiry when actualQty > 0', () => {
    const { resultExpiredDate: _omit, ...noExpiry } = base;
    expect(() => new CreateProductionOrder(noExpiry)).toThrow(
      'CREATE_PRODUCTION_ORDER.RESULT_EXPIRY_REQUIRED',
    );
  });

  it('should reject an invalid result expiry date', () => {
    expect(() => new CreateProductionOrder({ ...base, resultExpiredDate: 'not-a-date' })).toThrow(
      'CREATE_PRODUCTION_ORDER.RESULT_EXPIRY_INVALID',
    );
  });

  it('should reject a non-object payload', () => {
    expect(() => new CreateProductionOrder(null)).toThrow(
      'CREATE_PRODUCTION_ORDER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
