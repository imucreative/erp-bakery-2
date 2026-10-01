import {
  CreatePurchaseOrder,
  computeItemMoney,
  computeEstimatedPaymentDueDate,
  roundMoney,
  isValidDate,
} from '../entities/CreatePurchaseOrder';

function validPayload(over: Record<string, unknown> = {}) {
  return {
    purchaseRequestId: 'pr-1',
    supplierId: 'sup-1',
    orderDate: '2026-10-05',
    items: [
      { productId: 'prod-1', quantity: 3, uomId: 'uom-1', unitPrice: 5000, taxPercent: 11 },
      { productId: 'prod-2', quantity: 2, uomId: 'uom-1', unitPrice: 2500, taxPercent: 0 },
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

describe('isValidDate', () => {
  it('should accept valid dates and reject invalid ones', () => {
    expect(isValidDate('2026-10-05')).toBe(true);
    expect(isValidDate('not-a-date')).toBe(false);
  });
});

describe('computeItemMoney', () => {
  it('should compute subtotal, tax amount (percentage) and total', () => {
    const line = computeItemMoney({
      productId: 'p',
      quantity: 3,
      uomId: 'u',
      unitPrice: 5000,
      taxPercent: 11,
    });
    expect(line.subtotal).toBe(15000);
    expect(line.taxAmount).toBe(1650); // 15000 * 11%
    expect(line.total).toBe(16650);
  });

  it('should treat 0% tax as no tax', () => {
    const line = computeItemMoney({
      productId: 'p',
      quantity: 2,
      uomId: 'u',
      unitPrice: 2500,
      taxPercent: 0,
    });
    expect(line.subtotal).toBe(5000);
    expect(line.taxAmount).toBe(0);
    expect(line.total).toBe(5000);
  });
});

describe('computeEstimatedPaymentDueDate', () => {
  it('should add dueDays to the order date', () => {
    expect(computeEstimatedPaymentDueDate('2026-10-05', 30)).toBe('2026-11-04');
    expect(computeEstimatedPaymentDueDate('2026-10-05', 0)).toBe('2026-10-05');
  });

  it('should return null when there is no payment term', () => {
    expect(computeEstimatedPaymentDueDate('2026-10-05', null)).toBeNull();
  });
});

describe('CreatePurchaseOrder', () => {
  it('should compute item money server-side when items are provided', () => {
    const po = new CreatePurchaseOrder(validPayload());
    expect(po.items).not.toBeNull();
    expect(po.items![0].subtotal).toBe(15000);
    expect(po.items![0].taxAmount).toBe(1650);
    expect(po.items![0].total).toBe(16650);
    expect(po.items![1].subtotal).toBe(5000);
    expect(po.items![1].taxAmount).toBe(0);
  });

  it('should ignore client-supplied subtotal/tax/total', () => {
    const po = new CreatePurchaseOrder(
      validPayload({
        items: [
          {
            productId: 'p',
            quantity: 2,
            uomId: 'u',
            unitPrice: 1000,
            taxPercent: 10,
            subtotal: 999999,
            taxAmount: 999999,
            total: 999999,
          },
        ],
      }),
    );
    expect(po.items![0].subtotal).toBe(2000);
    expect(po.items![0].taxAmount).toBe(200);
    expect(po.items![0].total).toBe(2200);
  });

  it('should set items to null when the body omits items (prefill from PR later)', () => {
    const po = new CreatePurchaseOrder(validPayload({ items: undefined }));
    expect(po.items).toBeNull();
  });

  it('should default paymentTermId to null when absent', () => {
    const po = new CreatePurchaseOrder(validPayload());
    expect(po.paymentTermId).toBeNull();
  });

  it('should keep a provided paymentTermId', () => {
    const po = new CreatePurchaseOrder(validPayload({ paymentTermId: 'pt-1' }));
    expect(po.paymentTermId).toBe('pt-1');
  });

  it('should throw when purchaseRequestId is missing', () => {
    expect(() => new CreatePurchaseOrder(validPayload({ purchaseRequestId: undefined }))).toThrow(
      'CREATE_PURCHASE_ORDER.PURCHASE_REQUEST_REQUIRED',
    );
  });

  it('should throw when supplierId is missing', () => {
    expect(() => new CreatePurchaseOrder(validPayload({ supplierId: undefined }))).toThrow(
      'CREATE_PURCHASE_ORDER.SUPPLIER_REQUIRED',
    );
  });

  it('should throw when orderDate is invalid', () => {
    expect(() => new CreatePurchaseOrder(validPayload({ orderDate: 'nope' }))).toThrow(
      'CREATE_PURCHASE_ORDER.ORDER_DATE_INVALID',
    );
  });

  it('should throw when a provided item quantity is not positive', () => {
    expect(() =>
      new CreatePurchaseOrder(
        validPayload({
          items: [{ productId: 'p', quantity: 0, uomId: 'u', unitPrice: 1, taxPercent: 0 }],
        }),
      ),
    ).toThrow('CREATE_PURCHASE_ORDER.ITEM_QTY_MUST_BE_POSITIVE');
  });

  it('should throw when a provided item unitPrice is negative', () => {
    expect(() =>
      new CreatePurchaseOrder(
        validPayload({
          items: [{ productId: 'p', quantity: 1, uomId: 'u', unitPrice: -5, taxPercent: 0 }],
        }),
      ),
    ).toThrow('CREATE_PURCHASE_ORDER.ITEM_PRICE_MUST_BE_NON_NEGATIVE');
  });

  it('should throw when a provided item taxPercent is negative', () => {
    expect(() =>
      new CreatePurchaseOrder(
        validPayload({
          items: [{ productId: 'p', quantity: 1, uomId: 'u', unitPrice: 5, taxPercent: -1 }],
        }),
      ),
    ).toThrow('CREATE_PURCHASE_ORDER.ITEM_TAX_MUST_BE_NON_NEGATIVE');
  });

  it('should throw when a provided item is missing product or uom', () => {
    expect(() =>
      new CreatePurchaseOrder(
        validPayload({ items: [{ quantity: 1, uomId: 'u', unitPrice: 1, taxPercent: 0 }] }),
      ),
    ).toThrow('CREATE_PURCHASE_ORDER.ITEM_PRODUCT_REQUIRED');
    expect(() =>
      new CreatePurchaseOrder(
        validPayload({ items: [{ productId: 'p', quantity: 1, unitPrice: 1, taxPercent: 0 }] }),
      ),
    ).toThrow('CREATE_PURCHASE_ORDER.ITEM_UOM_REQUIRED');
  });
});
