import { OpenShiftUseCase } from '../OpenShiftUseCase';
import { CloseShiftUseCase } from '../CloseShiftUseCase';
import { GetShiftsUseCase } from '../GetShiftsUseCase';
import { ShiftRepository } from '../../../../Domains/shifts/ShiftRepository';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';
import { NotFoundError } from '../../../../Commons/exceptions/NotFoundError';

const shiftRepo: jest.Mocked<ShiftRepository> = {
  openShift: jest.fn(),
  closeShift: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
} as unknown as jest.Mocked<ShiftRepository>;

const outletRepo: jest.Mocked<OutletRepository> = {
  getOutletById: jest.fn(),
} as unknown as jest.Mocked<OutletRepository>;

beforeEach(() => jest.clearAllMocks());

describe('OpenShiftUseCase', () => {
  it('should validate payload, assert outlet company-scope, then open the shift', async () => {
    outletRepo.getOutletById.mockResolvedValue({ id: 'out1' } as never);
    shiftRepo.openShift.mockResolvedValue({ id: 's1' } as never);

    await new OpenShiftUseCase(shiftRepo, outletRepo).execute(
      { outletId: 'out1', openingCash: 500000 },
      'c1',
      'u1',
    );

    expect(outletRepo.getOutletById).toHaveBeenCalledWith('out1', 'c1');
    expect(shiftRepo.openShift).toHaveBeenCalledWith('c1', 'u1', {
      outletId: 'out1',
      openingCash: 500000,
      notes: null,
    });
  });

  it('should reject an invalid payload before touching repositories', async () => {
    await expect(
      new OpenShiftUseCase(shiftRepo, outletRepo).execute(
        { outletId: '', openingCash: 1 },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('OPEN_SHIFT.NOT_CONTAIN_NEEDED_PROPERTY');
    expect(outletRepo.getOutletById).not.toHaveBeenCalled();
    expect(shiftRepo.openShift).not.toHaveBeenCalled();
  });

  it('should reject a negative opening cash before touching repositories', async () => {
    await expect(
      new OpenShiftUseCase(shiftRepo, outletRepo).execute(
        { outletId: 'out1', openingCash: -5 },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('OPEN_SHIFT.CASH_MUST_BE_NON_NEGATIVE');
    expect(shiftRepo.openShift).not.toHaveBeenCalled();
  });

  it('should propagate OUTLET.NOT_FOUND when outlet is not in the company', async () => {
    outletRepo.getOutletById.mockRejectedValue(new NotFoundError('OUTLET.NOT_FOUND'));
    await expect(
      new OpenShiftUseCase(shiftRepo, outletRepo).execute(
        { outletId: 'out9', openingCash: 100 },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('OUTLET.NOT_FOUND');
    expect(shiftRepo.openShift).not.toHaveBeenCalled();
  });
});

describe('CloseShiftUseCase', () => {
  it('should validate payload and delegate to repo.closeShift', async () => {
    shiftRepo.getById.mockResolvedValue({ id: 's1', cashierUserId: 'u1' } as never);
    shiftRepo.closeShift.mockResolvedValue({ id: 's1' } as never);
    await new CloseShiftUseCase(shiftRepo).execute('s1', { actualCash: 480000 }, 'c1', 'u1');
    expect(shiftRepo.getById).toHaveBeenCalledWith('s1', 'c1');
    expect(shiftRepo.closeShift).toHaveBeenCalledWith('s1', 'c1', 'u1', {
      actualCash: 480000,
      notes: null,
    });
  });

  it("should reject closing another cashier's shift", async () => {
    shiftRepo.getById.mockResolvedValue({ id: 's1', cashierUserId: 'owner' } as never);

    await expect(
      new CloseShiftUseCase(shiftRepo).execute('s1', { actualCash: 480000 }, 'c1', 'cashier'),
    ).rejects.toThrow('AUTHORIZATION.ACCESS_DENIED');
    expect(shiftRepo.closeShift).not.toHaveBeenCalled();
  });

  it('should reject closing a shift without an authenticated user', async () => {
    shiftRepo.getById.mockResolvedValue({ id: 's1', cashierUserId: 'owner' } as never);

    await expect(
      new CloseShiftUseCase(shiftRepo).execute('s1', { actualCash: 480000 }, 'c1', null),
    ).rejects.toThrow('AUTHORIZATION.ACCESS_DENIED');
    expect(shiftRepo.closeShift).not.toHaveBeenCalled();
  });

  it('should reject a negative actual cash before repo', async () => {
    await expect(
      new CloseShiftUseCase(shiftRepo).execute('s1', { actualCash: -1 }, 'c1', 'u1'),
    ).rejects.toThrow('CLOSE_SHIFT.CASH_MUST_BE_NON_NEGATIVE');
    expect(shiftRepo.closeShift).not.toHaveBeenCalled();
  });
});

describe('GetShiftsUseCase', () => {
  it('should throw SHIFT.INVALID_STATUS for an unknown status', async () => {
    await expect(
      new GetShiftsUseCase(shiftRepo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('SHIFT.INVALID_STATUS');
    expect(shiftRepo.list).not.toHaveBeenCalled();
  });

  it('should list with a valid status', async () => {
    shiftRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetShiftsUseCase(shiftRepo).list({ limit: 10, offset: 0, status: 'OPEN' }, 'c1');
    expect(shiftRepo.list).toHaveBeenCalled();
  });

  it('should return detail via getById', async () => {
    shiftRepo.getById.mockResolvedValue({ id: 's1' } as never);
    const result = await new GetShiftsUseCase(shiftRepo).detail('s1', 'c1');
    expect(result).toEqual({ id: 's1' });
  });
});
