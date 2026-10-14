import { SalesOrderController } from '../sales-order.controller';

describe('SalesOrderController.list', () => {
  const getUseCase = { list: jest.fn().mockResolvedValue({ rows: [], total: 0 }) };
  const controller = new SalesOrderController(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    getUseCase as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('limits non-owner users to their own sales orders', async () => {
    await controller.list(
      { limit: '10' },
      { companyId: 'company-1', sub: 'cashier-1', roleCode: 'KASIR' } as never,
    );

    expect(getUseCase.list).toHaveBeenCalledWith(
      expect.objectContaining({ cashierUserId: 'cashier-1' }),
      'company-1',
    );
  });

  it('does not restrict owners to one cashier', async () => {
    await controller.list(
      { limit: '10' },
      { companyId: 'company-1', sub: 'owner-1', roleCode: 'OWNER' } as never,
    );

    expect(getUseCase.list).toHaveBeenCalledWith(
      expect.not.objectContaining({ cashierUserId: expect.anything() }),
      'company-1',
    );
  });
});
