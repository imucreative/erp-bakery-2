import { ShiftController } from '../shift.controller';

describe('ShiftController.list', () => {
  const getShiftsUseCase = { list: jest.fn().mockResolvedValue({ rows: [], total: 0 }) };
  const controller = new ShiftController({} as never, {} as never, getShiftsUseCase as never);

  beforeEach(() => jest.clearAllMocks());

  it('forces non-owner users to their own shifts, ignoring a requested cashier filter', async () => {
    await controller.list(
      { limit: '10', cashierUserId: 'another-user' },
      { companyId: 'company-1', sub: 'cashier-1', roleCode: 'KASIR' } as never,
    );

    expect(getShiftsUseCase.list).toHaveBeenCalledWith(
      expect.objectContaining({ cashierUserId: 'cashier-1' }),
      'company-1',
    );
  });

  it('allows owners to use the requested cashier filter', async () => {
    await controller.list(
      { limit: '10', cashierUserId: 'cashier-2' },
      { companyId: 'company-1', sub: 'owner-1', roleCode: 'OWNER' } as never,
    );

    expect(getShiftsUseCase.list).toHaveBeenCalledWith(
      expect.objectContaining({ cashierUserId: 'cashier-2' }),
      'company-1',
    );
  });
});
