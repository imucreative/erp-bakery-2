import { SubmitStockAdjustmentUseCase } from '../SubmitStockAdjustmentUseCase';
import { ApproveStockAdjustmentUseCase } from '../ApproveStockAdjustmentUseCase';
import { CancelStockAdjustmentUseCase } from '../CancelStockAdjustmentUseCase';
import { CompleteStockAdjustmentUseCase } from '../CompleteStockAdjustmentUseCase';
import { GetStockAdjustmentsUseCase } from '../GetStockAdjustmentsUseCase';
import { StockAdjustmentRepository } from '../../../../Domains/stock-adjustments/StockAdjustmentRepository';

const repo: jest.Mocked<StockAdjustmentRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  changeStatus: jest.fn(),
  complete: jest.fn(),
} as unknown as jest.Mocked<StockAdjustmentRepository>;

beforeEach(() => jest.clearAllMocks());

describe('SubmitStockAdjustmentUseCase', () => {
  it('should call changeStatus with SUBMITTED', async () => {
    repo.changeStatus.mockResolvedValue({ id: 'a' } as never);
    await new SubmitStockAdjustmentUseCase(repo).execute('a', 'c1', 'u1');
    expect(repo.changeStatus).toHaveBeenCalledWith('a', 'c1', 'u1', 'SUBMITTED');
  });
});

describe('ApproveStockAdjustmentUseCase', () => {
  it('should call changeStatus with APPROVED', async () => {
    repo.changeStatus.mockResolvedValue({ id: 'a' } as never);
    await new ApproveStockAdjustmentUseCase(repo).execute('a', 'c1', 'u1');
    expect(repo.changeStatus).toHaveBeenCalledWith('a', 'c1', 'u1', 'APPROVED');
  });
});

describe('CancelStockAdjustmentUseCase', () => {
  it('should call changeStatus with CANCELLED', async () => {
    repo.changeStatus.mockResolvedValue({ id: 'a' } as never);
    await new CancelStockAdjustmentUseCase(repo).execute('a', 'c1', 'u1');
    expect(repo.changeStatus).toHaveBeenCalledWith('a', 'c1', 'u1', 'CANCELLED');
  });
});

describe('CompleteStockAdjustmentUseCase', () => {
  it('should delegate to repo.complete', async () => {
    repo.complete.mockResolvedValue({ id: 'a' } as never);
    await new CompleteStockAdjustmentUseCase(repo).execute('a', 'c1', 'u1');
    expect(repo.complete).toHaveBeenCalledWith('a', 'c1', 'u1');
  });

  it('should propagate INVALID_STATUS_TRANSITION from repo', async () => {
    repo.complete.mockRejectedValue(new Error('STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION'));
    await expect(
      new CompleteStockAdjustmentUseCase(repo).execute('a', 'c1', 'u1'),
    ).rejects.toThrow('STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION');
  });
});

describe('GetStockAdjustmentsUseCase', () => {
  it('should list with a valid status filter', async () => {
    repo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetStockAdjustmentsUseCase(repo).list(
      { limit: 10, offset: 0, status: 'DRAFT' },
      'c1',
    );
    expect(repo.list).toHaveBeenCalled();
  });

  it('should throw INVALID_STATUS for an unknown status', async () => {
    await expect(
      new GetStockAdjustmentsUseCase(repo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('STOCK_ADJUSTMENT.INVALID_STATUS');
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('should return detail via getById', async () => {
    repo.getById.mockResolvedValue({ id: 'a' } as never);
    const result = await new GetStockAdjustmentsUseCase(repo).detail('a', 'c1');
    expect(result).toEqual({ id: 'a' });
    expect(repo.getById).toHaveBeenCalledWith('a', 'c1');
  });
});
