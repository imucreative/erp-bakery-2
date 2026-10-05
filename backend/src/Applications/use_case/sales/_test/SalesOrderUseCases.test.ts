import { CreateSalesOrderUseCase } from '../CreateSalesOrderUseCase';
import { PaySalesOrderUseCase } from '../PaySalesOrderUseCase';
import { VoidSalesOrderUseCase } from '../VoidSalesOrderUseCase';
import { RefundSalesOrderUseCase } from '../RefundSalesOrderUseCase';
import { GetSalesOrdersUseCase } from '../GetSalesOrdersUseCase';
import { SalesOrderRepository } from '../../../../Domains/sales/SalesOrderRepository';
import { ShiftRepository } from '../../../../Domains/shifts/ShiftRepository';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';
import { NotFoundError } from '../../../../Commons/exceptions/NotFoundError';

const salesRepo: jest.Mocked<SalesOrderRepository> = {
  resolveCheckoutItems: jest.fn(),
  createOrder: jest.fn(),
  pay: jest.fn(),
  void: jest.fn(),
  refund: jest.fn(),
  getById: jest.fn(),
  getReturnByOrderId: jest.fn(),
  list: jest.fn(),
  listPosProducts: jest.fn(),
  listActiveToppings: jest.fn(),
} as unknown as jest.Mocked<SalesOrderRepository>;

const shiftRepo: jest.Mocked<ShiftRepository> = {
  openShift: jest.fn(),
  closeShift: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
} as unknown as jest.Mocked<ShiftRepository>;

const outletRepo: jest.Mocked<OutletRepository> = {
  getOutletById: jest.fn(),
} as unknown as jest.Mocked<OutletRepository>;

const OPEN_SHIFT = {
  id: 'sh1',
  status: 'OPEN',
  outletId: 'out1',
  cashierUserId: 'u1',
};

function resolvedItem(over: Record<string, unknown> = {}) {
  return {
    productId: 'p1',
    saleMode: 'STOCK',
    recipeId: null,
    productNameSnapshot: 'Air Mineral',
    unitPriceSnapshot: 5000,
    qty: 3,
    itemDiscount: 0,
    toppingsPrice: 0,
    lineTotal: 15000,
    toppings: [],
    ...over,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('CreateSalesOrderUseCase', () => {
  const base = {
    outletId: 'out1',
    shiftId: 'sh1',
    items: [{ productId: 'p1', qty: 3 }],
  };

  it('should checkout: validate shift OPEN, resolve items, compute totals, persist', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'out1' } as never);
    shiftRepo.getById.mockResolvedValue(OPEN_SHIFT as never);
    salesRepo.resolveCheckoutItems.mockResolvedValue({ items: [resolvedItem()] as never });
    salesRepo.createOrder.mockResolvedValue({ id: 'so1' } as never);

    await new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo).execute(base, 'c1', 'u1');

    expect(outletRepo.getOutletById).toHaveBeenCalledWith('out1', 'c1');
    expect(shiftRepo.getById).toHaveBeenCalledWith('sh1', 'c1');
    const persisted = salesRepo.createOrder.mock.calls[0][1];
    expect(persisted.subtotal).toBe(15000);
    expect(persisted.grandTotal).toBe(15000);
    expect(persisted.itemCount).toBe(3);
    expect(persisted.tax).toBe(0);
  });

  it('should clamp order discount so grand total never goes negative', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'out1' } as never);
    shiftRepo.getById.mockResolvedValue(OPEN_SHIFT as never);
    salesRepo.resolveCheckoutItems.mockResolvedValue({ items: [resolvedItem()] as never });
    salesRepo.createOrder.mockResolvedValue({ id: 'so1' } as never);

    await new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo).execute(
      { ...base, orderDiscount: 999999 },
      'c1',
      'u1',
    );

    const persisted = salesRepo.createOrder.mock.calls[0][1];
    expect(persisted.orderDiscount).toBe(15000);
    expect(persisted.grandTotal).toBe(0);
  });

  it('should reject when shift is not OPEN (SHIFT.NOT_OPEN)', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'out1' } as never);
    shiftRepo.getById.mockResolvedValue({ ...OPEN_SHIFT, status: 'CLOSED' } as never);

    await expect(
      new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo).execute(base, 'c1', 'u1'),
    ).rejects.toThrow('SHIFT.NOT_OPEN');
    expect(salesRepo.createOrder).not.toHaveBeenCalled();
  });

  it('should reject when shift belongs to another outlet (SHIFT.NOT_OPEN)', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'out1' } as never);
    shiftRepo.getById.mockResolvedValue({ ...OPEN_SHIFT, outletId: 'outX' } as never);

    await expect(
      new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo).execute(base, 'c1', 'u1'),
    ).rejects.toThrow('SHIFT.NOT_OPEN');
  });

  it('should reject when shift belongs to another cashier (SHIFT.NOT_OPEN)', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'out1' } as never);
    shiftRepo.getById.mockResolvedValue({ ...OPEN_SHIFT, cashierUserId: 'other' } as never);

    await expect(
      new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo).execute(base, 'c1', 'u1'),
    ).rejects.toThrow('SHIFT.NOT_OPEN');
  });

  it('should reject an empty cart before touching repositories', async () => {
    await expect(
      new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo).execute(
        { outletId: 'out1', shiftId: 'sh1', items: [] },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('CREATE_SALES_ORDER.ITEMS_REQUIRED');
    expect(outletRepo.getOutletById).not.toHaveBeenCalled();
  });

  it('should propagate RECIPE.NO_ACTIVE_RECIPE from resolution', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'out1' } as never);
    shiftRepo.getById.mockResolvedValue(OPEN_SHIFT as never);
    salesRepo.resolveCheckoutItems.mockRejectedValue(new NotFoundError('RECIPE.NO_ACTIVE_RECIPE'));

    await expect(
      new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo).execute(base, 'c1', 'u1'),
    ).rejects.toThrow('RECIPE.NO_ACTIVE_RECIPE');
    expect(salesRepo.createOrder).not.toHaveBeenCalled();
  });

  it('should sum multiple item line totals into subtotal', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'out1' } as never);
    shiftRepo.getById.mockResolvedValue(OPEN_SHIFT as never);
    salesRepo.resolveCheckoutItems.mockResolvedValue({
      items: [
        resolvedItem({ lineTotal: 15000, qty: 3 }),
        resolvedItem({ productId: 'p2', lineTotal: 20000, qty: 2 }),
      ] as never,
    });
    salesRepo.createOrder.mockResolvedValue({ id: 'so1' } as never);

    await new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo).execute(
      { outletId: 'out1', shiftId: 'sh1', items: [{ productId: 'p1', qty: 3 }, { productId: 'p2', qty: 2 }] },
      'c1',
      'u1',
    );
    const persisted = salesRepo.createOrder.mock.calls[0][1];
    expect(persisted.subtotal).toBe(35000);
    expect(persisted.itemCount).toBe(5);
  });
});

describe('PaySalesOrderUseCase', () => {
  it('should validate payload and delegate to repo.pay', async () => {
    salesRepo.pay.mockResolvedValue({ id: 'so1', status: 'PAID' } as never);
    await new PaySalesOrderUseCase(salesRepo).execute(
      'so1',
      { payments: [{ method: 'CASH', amount: 15000 }] },
      'c1',
      'u1',
    );
    expect(salesRepo.pay).toHaveBeenCalledWith('so1', 'c1', 'u1', [
      { method: 'CASH', amount: 15000, referenceNo: null },
    ]);
  });

  it('should reject an invalid payment method before repo', async () => {
    await expect(
      new PaySalesOrderUseCase(salesRepo).execute(
        'so1',
        { payments: [{ method: 'BITCOIN', amount: 1 }] },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('PAY_SALES_ORDER.INVALID_PAYMENT_METHOD');
    expect(salesRepo.pay).not.toHaveBeenCalled();
  });

  it('should reject empty payments before repo', async () => {
    await expect(
      new PaySalesOrderUseCase(salesRepo).execute('so1', { payments: [] }, 'c1', 'u1'),
    ).rejects.toThrow('PAY_SALES_ORDER.PAYMENTS_REQUIRED');
  });
});

describe('VoidSalesOrderUseCase', () => {
  it('should delegate to repo.void', async () => {
    salesRepo.void.mockResolvedValue({ id: 'so1', status: 'CANCELLED' } as never);
    await new VoidSalesOrderUseCase(salesRepo).execute('so1', 'c1', 'u1');
    expect(salesRepo.void).toHaveBeenCalledWith('so1', 'c1', 'u1');
  });
});

describe('RefundSalesOrderUseCase', () => {
  it('should delegate full-order refund to repo.refund with the reason', async () => {
    salesRepo.refund.mockResolvedValue({
      order: { id: 'so1', status: 'REFUNDED' },
      salesReturn: { id: 'ret1', refundAmount: 15000 },
    } as never);

    const result = await new RefundSalesOrderUseCase(salesRepo).execute(
      'so1',
      'Produk rusak',
      'c1',
      'u1',
    );

    expect(salesRepo.refund).toHaveBeenCalledWith('so1', 'c1', 'u1', 'Produk rusak');
    expect(result.order.status).toBe('REFUNDED');
    expect(result.salesReturn.refundAmount).toBe(15000);
  });

  it('should pass a null reason through to the repo', async () => {
    salesRepo.refund.mockResolvedValue({
      order: { id: 'so1', status: 'REFUNDED' },
      salesReturn: { id: 'ret1' },
    } as never);
    await new RefundSalesOrderUseCase(salesRepo).execute('so1', null, 'c1', 'u1');
    expect(salesRepo.refund).toHaveBeenCalledWith('so1', 'c1', 'u1', null);
  });
});

describe('GetSalesOrdersUseCase', () => {
  it('should list, detail, posProducts and activeToppings via repo', async () => {
    salesRepo.list.mockResolvedValue({ rows: [], total: 0 });
    salesRepo.getById.mockResolvedValue({ id: 'so1' } as never);
    salesRepo.getReturnByOrderId.mockResolvedValue(null);
    salesRepo.listPosProducts.mockResolvedValue({ rows: [], total: 0 });
    salesRepo.listActiveToppings.mockResolvedValue([]);

    const uc = new GetSalesOrdersUseCase(salesRepo);
    await uc.list({ limit: 10, offset: 0 }, 'c1');
    await uc.detail('so1', 'c1');
    await uc.returnByOrderId('so1', 'c1');
    await uc.posProducts({ limit: 50, offset: 0 }, 'c1');
    await uc.activeToppings('c1');

    expect(salesRepo.list).toHaveBeenCalled();
    expect(salesRepo.getById).toHaveBeenCalledWith('so1', 'c1');
    expect(salesRepo.getReturnByOrderId).toHaveBeenCalledWith('so1', 'c1');
    expect(salesRepo.listPosProducts).toHaveBeenCalled();
    expect(salesRepo.listActiveToppings).toHaveBeenCalledWith('c1');
  });
});
