import { CreateProductionOrderUseCase } from '../CreateProductionOrderUseCase';
import { StartProductionOrderUseCase } from '../StartProductionOrderUseCase';
import { RecordYieldUseCase } from '../RecordYieldUseCase';
import { QaCheckUseCase } from '../QaCheckUseCase';
import { CompleteProductionOrderUseCase } from '../CompleteProductionOrderUseCase';
import { CancelProductionOrderUseCase } from '../CancelProductionOrderUseCase';
import { GetProductionOrdersUseCase } from '../GetProductionOrdersUseCase';
import { ProductionOrderRepository } from '../../../../Domains/production/ProductionOrderRepository';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';

const prodRepo: jest.Mocked<ProductionOrderRepository> = {
  schedule: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  start: jest.fn(),
  recordYield: jest.fn(),
  qaPass: jest.fn(),
  qaFail: jest.fn(),
  complete: jest.fn(),
  cancel: jest.fn(),
} as unknown as jest.Mocked<ProductionOrderRepository>;

const outletRepo: jest.Mocked<OutletRepository> = {
  getOutletById: jest.fn(),
} as unknown as jest.Mocked<OutletRepository>;

const validCreate = { outletId: 'outlet-1', recipeId: 'recipe-1', scheduledQty: 40 };

beforeEach(() => {
  jest.clearAllMocks();
  outletRepo.getOutletById.mockResolvedValue({ id: 'outlet-1' } as never);
});

describe('CreateProductionOrderUseCase', () => {
  it('should validate the outlet then schedule', async () => {
    prodRepo.schedule.mockResolvedValue({ id: 'po1' } as never);

    await new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(validCreate, 'c1', 'u1');

    expect(outletRepo.getOutletById).toHaveBeenCalledWith('outlet-1', 'c1');
    expect(prodRepo.schedule).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ outletId: 'outlet-1', recipeId: 'recipe-1', createdBy: 'u1' }),
    );
  });

  it('should propagate OUTLET.NOT_FOUND before scheduling', async () => {
    outletRepo.getOutletById.mockRejectedValueOnce(new Error('OUTLET.NOT_FOUND'));

    await expect(
      new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(validCreate, 'c1', 'u1'),
    ).rejects.toThrow('OUTLET.NOT_FOUND');
    expect(prodRepo.schedule).not.toHaveBeenCalled();
  });

  it('should reject an invalid payload before touching repos', async () => {
    await expect(
      new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(
        { outletId: 'outlet-1', scheduledQty: 40 },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('CREATE_PRODUCTION_ORDER.RECIPE_OR_PRODUCT_REQUIRED');
    expect(outletRepo.getOutletById).not.toHaveBeenCalled();
  });
});

describe('StartProductionOrderUseCase', () => {
  it('should delegate to repo.start', async () => {
    prodRepo.start.mockResolvedValue({ id: 'po1' } as never);
    await new StartProductionOrderUseCase(prodRepo).execute('po1', 'c1', 'u1');
    expect(prodRepo.start).toHaveBeenCalledWith('po1', 'c1', 'u1');
  });
});

describe('RecordYieldUseCase', () => {
  it('should validate payload then delegate', async () => {
    prodRepo.recordYield.mockResolvedValue({ id: 'po1' } as never);
    await new RecordYieldUseCase(prodRepo).execute(
      'po1',
      { actualQty: 38, wasteQty: 2, resultExpiredDate: '2026-10-05' },
      'c1',
      'u1',
    );
    expect(prodRepo.recordYield).toHaveBeenCalledWith(
      'po1',
      'c1',
      expect.objectContaining({ actualQty: 38, wasteQty: 2, resultExpiredDate: '2026-10-05' }),
    );
  });

  it('should reject invalid yield payload before delegating', async () => {
    await expect(
      new RecordYieldUseCase(prodRepo).execute('po1', { actualQty: 0 }, 'c1', 'u1'),
    ).rejects.toThrow('RECORD_YIELD.QTY_MUST_BE_POSITIVE');
    expect(prodRepo.recordYield).not.toHaveBeenCalled();
  });
});

describe('QaCheckUseCase', () => {
  it('should call qaPass when passed=true', async () => {
    prodRepo.qaPass.mockResolvedValue({ id: 'po1' } as never);
    await new QaCheckUseCase(prodRepo).execute('po1', true, 'c1', 'looks good', 'u1');
    expect(prodRepo.qaPass).toHaveBeenCalledWith('po1', 'c1', 'looks good', 'u1');
    expect(prodRepo.qaFail).not.toHaveBeenCalled();
  });

  it('should call qaFail when passed=false', async () => {
    prodRepo.qaFail.mockResolvedValue({ id: 'po1' } as never);
    await new QaCheckUseCase(prodRepo).execute('po1', false, 'c1', 'burnt', 'u1');
    expect(prodRepo.qaFail).toHaveBeenCalledWith('po1', 'c1', 'burnt', 'u1');
    expect(prodRepo.qaPass).not.toHaveBeenCalled();
  });
});

describe('CompleteProductionOrderUseCase', () => {
  it('should delegate to repo.complete', async () => {
    prodRepo.complete.mockResolvedValue({ id: 'po1' } as never);
    await new CompleteProductionOrderUseCase(prodRepo).execute('po1', 'c1', 'u1');
    expect(prodRepo.complete).toHaveBeenCalledWith('po1', 'c1', 'u1');
  });

  it('should propagate INSUFFICIENT_STOCK', async () => {
    prodRepo.complete.mockRejectedValue(new Error('INVENTORY.INSUFFICIENT_STOCK'));
    await expect(
      new CompleteProductionOrderUseCase(prodRepo).execute('po1', 'c1', 'u1'),
    ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
  });
});

describe('CancelProductionOrderUseCase', () => {
  it('should delegate to repo.cancel', async () => {
    prodRepo.cancel.mockResolvedValue({ id: 'po1' } as never);
    await new CancelProductionOrderUseCase(prodRepo).execute('po1', 'c1', 'no demand', 'u1');
    expect(prodRepo.cancel).toHaveBeenCalledWith('po1', 'c1', 'no demand', 'u1');
  });
});

describe('GetProductionOrdersUseCase', () => {
  it('should throw INVALID_STATUS for unknown status', async () => {
    await expect(
      new GetProductionOrdersUseCase(prodRepo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('PRODUCTION_ORDER.INVALID_STATUS');
  });

  it('should list with a valid status', async () => {
    prodRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetProductionOrdersUseCase(prodRepo).list(
      { limit: 10, offset: 0, status: 'SCHEDULED' },
      'c1',
    );
    expect(prodRepo.list).toHaveBeenCalled();
  });

  it('should return detail via getById', async () => {
    prodRepo.getById.mockResolvedValue({ id: 'po1' } as never);
    const result = await new GetProductionOrdersUseCase(prodRepo).detail('po1', 'c1');
    expect(result).toEqual({ id: 'po1' });
  });
});
