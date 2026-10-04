import {
  canTransition,
  isSalesOrderStatus,
  SALES_ORDER_STATUSES,
} from '../salesOrderStatus';
import { isSaleMode, SALE_MODES } from '../saleMode';
import { isPaymentMethod, PAYMENT_METHODS } from '../paymentMethod';
import { CreateSalesOrder } from '../entities/CreateSalesOrder';
import { PaySalesOrder } from '../entities/PaySalesOrder';

describe('salesOrderStatus', () => {
  it('recognises valid statuses', () => {
    for (const s of SALES_ORDER_STATUSES) expect(isSalesOrderStatus(s)).toBe(true);
    expect(isSalesOrderStatus('NOPE')).toBe(false);
  });

  it('allows the documented transitions (doc 51 §6.1)', () => {
    expect(canTransition('PENDING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransition('PENDING_PAYMENT', 'CANCELLED')).toBe(true);
    // REFUNDED only reachable from PAID (used in Fase 3).
    expect(canTransition('PAID', 'REFUNDED')).toBe(true);
  });

  it('forbids invalid transitions', () => {
    expect(canTransition('PAID', 'CANCELLED')).toBe(false);
    expect(canTransition('REFUNDED', 'PAID')).toBe(false);
    expect(canTransition('CANCELLED', 'PAID')).toBe(false);
    expect(canTransition('PENDING_PAYMENT', 'REFUNDED')).toBe(false);
  });
});

describe('saleMode', () => {
  it('recognises valid modes', () => {
    for (const m of SALE_MODES) expect(isSaleMode(m)).toBe(true);
    expect(isSaleMode('OTHER')).toBe(false);
  });
});

describe('paymentMethod', () => {
  it('recognises valid methods', () => {
    for (const m of PAYMENT_METHODS) expect(isPaymentMethod(m)).toBe(true);
    expect(isPaymentMethod('BITCOIN')).toBe(false);
  });
});

describe('CreateSalesOrder entity', () => {
  it('accepts a valid STOCK checkout payload', () => {
    const vo = new CreateSalesOrder({
      outletId: 'out1',
      shiftId: 'sh1',
      items: [{ productId: 'p1', qty: 3 }],
    });
    expect(vo.outletId).toBe('out1');
    expect(vo.orderDiscount).toBe(0);
    expect(vo.items[0].itemDiscount).toBe(0);
    expect(vo.items[0].toppings).toEqual([]);
  });

  it('accepts items with toppings', () => {
    const vo = new CreateSalesOrder({
      outletId: 'out1',
      shiftId: 'sh1',
      items: [
        { productId: 'p1', qty: 2, itemDiscount: 1000, toppings: [{ toppingProductId: 't1' }] },
      ],
    });
    expect(vo.items[0].toppings).toEqual([{ toppingProductId: 't1' }]);
  });

  it('rejects missing outlet/shift', () => {
    expect(() => new CreateSalesOrder({ items: [{ productId: 'p1', qty: 1 }] })).toThrow(
      'CREATE_SALES_ORDER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('rejects an empty cart', () => {
    expect(() => new CreateSalesOrder({ outletId: 'o', shiftId: 's', items: [] })).toThrow(
      'CREATE_SALES_ORDER.ITEMS_REQUIRED',
    );
  });

  it('rejects a non-positive item qty', () => {
    expect(
      () =>
        new CreateSalesOrder({ outletId: 'o', shiftId: 's', items: [{ productId: 'p', qty: 0 }] }),
    ).toThrow('CREATE_SALES_ORDER.ITEM_QTY_MUST_BE_POSITIVE');
  });

  it('rejects a negative discount', () => {
    expect(
      () =>
        new CreateSalesOrder({
          outletId: 'o',
          shiftId: 's',
          orderDiscount: -1,
          items: [{ productId: 'p', qty: 1 }],
        }),
    ).toThrow('CREATE_SALES_ORDER.DISCOUNT_MUST_BE_NON_NEGATIVE');
  });

  it('rejects a malformed topping', () => {
    expect(
      () =>
        new CreateSalesOrder({
          outletId: 'o',
          shiftId: 's',
          items: [{ productId: 'p', qty: 1, toppings: [{}] }],
        }),
    ).toThrow('CREATE_SALES_ORDER.TOPPING_PRODUCT_REQUIRED');
  });
});

describe('PaySalesOrder entity', () => {
  it('accepts valid payments', () => {
    const vo = new PaySalesOrder({
      payments: [{ method: 'CASH', amount: 15000 }, { method: 'QRIS', amount: 5000, referenceNo: 'X' }],
    });
    expect(vo.payments).toHaveLength(2);
    expect(vo.payments[0].referenceNo).toBeNull();
    expect(vo.payments[1].referenceNo).toBe('X');
  });

  it('rejects empty payments', () => {
    expect(() => new PaySalesOrder({ payments: [] })).toThrow('PAY_SALES_ORDER.PAYMENTS_REQUIRED');
  });

  it('rejects invalid method', () => {
    expect(() => new PaySalesOrder({ payments: [{ method: 'GOLD', amount: 1 }] })).toThrow(
      'PAY_SALES_ORDER.INVALID_PAYMENT_METHOD',
    );
  });

  it('rejects a non-positive amount', () => {
    expect(() => new PaySalesOrder({ payments: [{ method: 'CASH', amount: 0 }] })).toThrow(
      'PAY_SALES_ORDER.AMOUNT_MUST_BE_POSITIVE',
    );
  });
});
