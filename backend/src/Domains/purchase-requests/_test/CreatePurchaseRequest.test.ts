import {
  CreatePurchaseRequest,
  isTomorrowOrLater,
  roundMoney,
} from '../entities/CreatePurchaseRequest';

/** ISO date string N days from today (local). */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function validPayload(over: Record<string, unknown> = {}) {
  return {
    destinationOutletId: 'outlet-1',
    expectedDate: isoDaysFromNow(2),
    items: [
      { productId: 'prod-1', quantity: 3, uomId: 'uom-1', estimatedPrice: 5000 },
      { productId: 'prod-2', quantity: 2, uomId: 'uom-1', estimatedPrice: 2500 },
    ],
    ...over,
  };
}

describe('roundMoney', () => {
  it('should round to two decimals', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe('isTomorrowOrLater', () => {
  it('should accept tomorrow and later', () => {
    expect(isTomorrowOrLater(isoDaysFromNow(1))).toBe(true);
    expect(isTomorrowOrLater(isoDaysFromNow(30))).toBe(true);
  });

  it('should reject today and past dates', () => {
    expect(isTomorrowOrLater(isoDaysFromNow(0))).toBe(false);
    expect(isTomorrowOrLater(isoDaysFromNow(-1))).toBe(false);
  });

  it('should reject invalid date strings', () => {
    expect(isTomorrowOrLater('not-a-date')).toBe(false);
  });
});

describe('CreatePurchaseRequest', () => {
  it('should compute subtotal per item and header total server-side', () => {
    const pr = new CreatePurchaseRequest(validPayload());
    expect(pr.items[0].subtotal).toBe(15000);
    expect(pr.items[1].subtotal).toBe(5000);
    expect(pr.totalEstimatedAmount).toBe(20000);
  });

  it('should ignore any client-supplied subtotal/total', () => {
    const pr = new CreatePurchaseRequest(
      validPayload({
        totalEstimatedAmount: 999999,
        items: [
          { productId: 'p', quantity: 2, uomId: 'u', estimatedPrice: 1000, subtotal: 999999 },
        ],
      }),
    );
    expect(pr.items[0].subtotal).toBe(2000);
    expect(pr.totalEstimatedAmount).toBe(2000);
  });

  it('should throw when destinationOutletId is missing', () => {
    expect(() => new CreatePurchaseRequest(validPayload({ destinationOutletId: undefined }))).toThrow(
      'CREATE_PURCHASE_REQUEST.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw when expectedDate is today or earlier', () => {
    expect(() => new CreatePurchaseRequest(validPayload({ expectedDate: isoDaysFromNow(0) }))).toThrow(
      'CREATE_PURCHASE_REQUEST.EXPECTED_DATE_TOO_EARLY',
    );
  });

  it('should throw when items are empty', () => {
    expect(() => new CreatePurchaseRequest(validPayload({ items: [] }))).toThrow(
      'CREATE_PURCHASE_REQUEST.ITEMS_REQUIRED',
    );
  });

  it('should throw when quantity is not positive', () => {
    expect(() =>
      new CreatePurchaseRequest(
        validPayload({ items: [{ productId: 'p', quantity: 0, uomId: 'u', estimatedPrice: 1 }] }),
      ),
    ).toThrow('CREATE_PURCHASE_REQUEST.ITEM_QTY_MUST_BE_POSITIVE');
  });

  it('should throw when estimatedPrice is negative', () => {
    expect(() =>
      new CreatePurchaseRequest(
        validPayload({ items: [{ productId: 'p', quantity: 1, uomId: 'u', estimatedPrice: -5 }] }),
      ),
    ).toThrow('CREATE_PURCHASE_REQUEST.ITEM_PRICE_MUST_BE_NON_NEGATIVE');
  });

  it('should throw when a line is missing product or uom', () => {
    expect(() =>
      new CreatePurchaseRequest(
        validPayload({ items: [{ quantity: 1, uomId: 'u', estimatedPrice: 1 }] }),
      ),
    ).toThrow('CREATE_PURCHASE_REQUEST.ITEM_PRODUCT_REQUIRED');
    expect(() =>
      new CreatePurchaseRequest(
        validPayload({ items: [{ productId: 'p', quantity: 1, estimatedPrice: 1 }] }),
      ),
    ).toThrow('CREATE_PURCHASE_REQUEST.ITEM_UOM_REQUIRED');
  });
});
