import { CreateProductionOrderUseCase } from '../CreateProductionOrderUseCase';
import { GetProductionOrdersUseCase } from '../GetProductionOrdersUseCase';
import { ProductionOrderRepository } from '../../../../Domains/production/ProductionOrderRepository';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';

const prodRepo: jest.Mocked<ProductionOrderRepository> = {
  createInstant: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
} as unknown as jest.Mocked<ProductionOrderRepository>;

const outletRepo: jest.Mocked<OutletRepository> = {
  getOutletById: jest.fn(),
} as unknown as jest.Mocked<OutletRepository>;

const validCreate = {
  outletId: 'outlet-1',
  recipeId: 'recipe-1',
  scheduledQty: 40,
  actualQty: 38,
  wasteQty: 2,
  resultExpiredDate: '2026-10-05',
};

beforeEach(() => {
  jest.clearAllMocks();
  outletRepo.getOutletById.mockResolvedValue({ id: 'outlet-1' } as never);
});

describe('CreateProductionOrderUseCase (instant-complete)', () => {
  it('should validate the outlet then run instant production', async () => {
    prodRepo.createInstant.mockResolvedValue({ id: 'po1' } as never);

    await new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(validCreate, 'c1', 'u1');

    expect(outletRepo.getOutletById).toHaveBeenCalledWith('outlet-1', 'c1');
    expect(prodRepo.createInstant).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        outletId: 'outlet-1',
        recipeId: 'recipe-1',
        scheduledQty: 40,
        actualQty: 38,
        wasteQty: 2,
        resultExpiredDate: '2026-10-05',
        createdBy: 'u1',
      }),
    );
  });

  it('should allow actualQty = 0 (full waste) without a result expiry', async () => {
    prodRepo.createInstant.mockResolvedValue({ id: 'po1' } as never);

    await new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(
      { outletId: 'outlet-1', recipeId: 'recipe-1', scheduledQty: 40, actualQty: 0, wasteQty: 40 },
      'c1',
      'u1',
    );

    expect(prodRepo.createInstant).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ actualQty: 0, wasteQty: 40, resultExpiredDate: null }),
    );
  });

  it('should propagate OUTLET.NOT_FOUND before producing', async () => {
    outletRepo.getOutletById.mockRejectedValueOnce(new Error('OUTLET.NOT_FOUND'));

    await expect(
      new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(validCreate, 'c1', 'u1'),
    ).rejects.toThrow('OUTLET.NOT_FOUND');
    expect(prodRepo.createInstant).not.toHaveBeenCalled();
  });

  it('should reject an invalid payload before touching repos', async () => {
    await expect(
      new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(
        { outletId: 'outlet-1', scheduledQty: 40, actualQty: 10 },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('CREATE_PRODUCTION_ORDER.RECIPE_OR_PRODUCT_REQUIRED');
    expect(outletRepo.getOutletById).not.toHaveBeenCalled();
  });

  it('should require result expiry when actualQty > 0', async () => {
    await expect(
      new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(
        { outletId: 'outlet-1', recipeId: 'recipe-1', scheduledQty: 40, actualQty: 38 },
        'c1',
        'u1',
      ),
    ).rejects.toThrow('CREATE_PRODUCTION_ORDER.RESULT_EXPIRY_REQUIRED');
    expect(outletRepo.getOutletById).not.toHaveBeenCalled();
  });

  it('should propagate INSUFFICIENT_STOCK from the repository', async () => {
    prodRepo.createInstant.mockRejectedValue(new Error('INVENTORY.INSUFFICIENT_STOCK'));
    await expect(
      new CreateProductionOrderUseCase(prodRepo, outletRepo).execute(validCreate, 'c1', 'u1'),
    ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
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
      { limit: 10, offset: 0, status: 'COMPLETED' },
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
