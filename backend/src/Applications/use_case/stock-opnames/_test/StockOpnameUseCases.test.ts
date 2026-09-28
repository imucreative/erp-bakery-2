import { CreateStockOpnameUseCase } from '../CreateStockOpnameUseCase';
import { StartStockOpnameUseCase } from '../StartStockOpnameUseCase';
import { RecordCountUseCase } from '../RecordCountUseCase';
import { SubmitStockOpnameUseCase } from '../SubmitStockOpnameUseCase';
import { ApproveStockOpnameUseCase } from '../ApproveStockOpnameUseCase';
import { CompleteStockOpnameUseCase } from '../CompleteStockOpnameUseCase';
import { CancelStockOpnameUseCase } from '../CancelStockOpnameUseCase';
import { GetStockOpnamesUseCase } from '../GetStockOpnamesUseCase';
import { StockOpnameRepository } from '../../../../Domains/stock-opnames/StockOpnameRepository';

const repo: jest.Mocked<StockOpnameRepository> = {
  createDraft: jest.fn(),
  start: jest.fn(),
  recordCount: jest.fn(),
  submit: jest.fn(),
  approve: jest.fn(),
  cancel: jest.fn(),
  complete: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
} as unknown as jest.Mocked<StockOpnameRepository>;

beforeEach(() => jest.clearAllMocks());

describe('CreateStockOpnameUseCase', () => {
  it('should validate and create a draft', async () => {
    repo.createDraft.mockResolvedValue({ id: 'o1' } as never);
    await new CreateStockOpnameUseCase(repo).execute({ outletId: 'out1' }, 'c1', 'u1');
    expect(repo.createDraft).toHaveBeenCalledWith('c1', 'u1', {
      outletId: 'out1',
      opnameDate: null,
      notes: null,
    });
  });

  it('should reject invalid payload before repo', async () => {
    await expect(
      new CreateStockOpnameUseCase(repo).execute({ outletId: '' }, 'c1', 'u1'),
    ).rejects.toThrow('CREATE_STOCK_OPNAME.NOT_CONTAIN_NEEDED_PROPERTY');
    expect(repo.createDraft).not.toHaveBeenCalled();
  });
});

describe('Status use cases delegate to repository', () => {
  it('start -> repo.start', async () => {
    repo.start.mockResolvedValue({ id: 'o' } as never);
    await new StartStockOpnameUseCase(repo).execute('o', 'c1', 'u1');
    expect(repo.start).toHaveBeenCalledWith('o', 'c1', 'u1');
  });

  it('submit -> repo.submit', async () => {
    repo.submit.mockResolvedValue({ id: 'o' } as never);
    await new SubmitStockOpnameUseCase(repo).execute('o', 'c1', 'u1');
    expect(repo.submit).toHaveBeenCalledWith('o', 'c1', 'u1');
  });

  it('approve -> repo.approve', async () => {
    repo.approve.mockResolvedValue({ id: 'o' } as never);
    await new ApproveStockOpnameUseCase(repo).execute('o', 'c1', 'u1');
    expect(repo.approve).toHaveBeenCalledWith('o', 'c1', 'u1');
  });

  it('complete -> repo.complete', async () => {
    repo.complete.mockResolvedValue({ id: 'o' } as never);
    await new CompleteStockOpnameUseCase(repo).execute('o', 'c1', 'u1');
    expect(repo.complete).toHaveBeenCalledWith('o', 'c1', 'u1');
  });

  it('cancel -> repo.cancel', async () => {
    repo.cancel.mockResolvedValue({ id: 'o' } as never);
    await new CancelStockOpnameUseCase(repo).execute('o', 'c1', 'u1');
    expect(repo.cancel).toHaveBeenCalledWith('o', 'c1', 'u1');
  });
});

describe('RecordCountUseCase', () => {
  it('should validate count and delegate to repo.recordCount', async () => {
    repo.recordCount.mockResolvedValue({ id: 'o' } as never);
    await new RecordCountUseCase(repo).execute('o', 'item1', { countedQty: 7 }, 'c1');
    expect(repo.recordCount).toHaveBeenCalledWith('o', 'item1', 'c1', 7);
  });

  it('should reject negative count before repo', async () => {
    await expect(
      new RecordCountUseCase(repo).execute('o', 'item1', { countedQty: -2 }, 'c1'),
    ).rejects.toThrow('RECORD_COUNT.QTY_MUST_BE_NON_NEGATIVE');
    expect(repo.recordCount).not.toHaveBeenCalled();
  });
});

describe('GetStockOpnamesUseCase', () => {
  it('should throw INVALID_STATUS for unknown status', async () => {
    await expect(
      new GetStockOpnamesUseCase(repo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('STOCK_OPNAME.INVALID_STATUS');
  });

  it('should list with a valid status', async () => {
    repo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetStockOpnamesUseCase(repo).list({ limit: 10, offset: 0, status: 'COUNTING' }, 'c1');
    expect(repo.list).toHaveBeenCalled();
  });

  it('should return detail via getById', async () => {
    repo.getById.mockResolvedValue({ id: 'o' } as never);
    const result = await new GetStockOpnamesUseCase(repo).detail('o', 'c1');
    expect(result).toEqual({ id: 'o' });
  });
});
