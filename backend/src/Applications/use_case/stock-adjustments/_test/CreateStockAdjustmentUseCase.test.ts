import { CreateStockAdjustmentUseCase } from '../CreateStockAdjustmentUseCase';
import { StockAdjustmentRepository } from '../../../../Domains/stock-adjustments/StockAdjustmentRepository';
import { InventoryRepository } from '../../../../Domains/inventory/InventoryRepository';
import { InventoryBatch } from '../../../../Domains/inventory/entities/InventoryBatch';

const mockAdjRepo: jest.Mocked<StockAdjustmentRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  changeStatus: jest.fn(),
  complete: jest.fn(),
} as unknown as jest.Mocked<StockAdjustmentRepository>;

const mockInvRepo: jest.Mocked<InventoryRepository> = {
  getStockOnHand: jest.fn(),
  getLedger: jest.fn(),
  getBatches: jest.fn(),
  getBatchById: jest.fn(),
  planFefoAllocation: jest.fn(),
  postMovements: jest.fn(),
} as unknown as jest.Mocked<InventoryRepository>;

function batch(overrides: Partial<ConstructorParameters<typeof InventoryBatch>[0]> = {}) {
  return new InventoryBatch({
    id: 'batch-uuid',
    companyId: 'c1',
    outletId: 'outlet-uuid',
    productId: 'product-uuid',
    batchNumber: 'B-1',
    lotKey: '',
    expiredDate: new Date('2026-12-31'),
    qtyAvailable: 10,
    status: 'ACTIVE',
    ...overrides,
  });
}

const payload = {
  outletId: 'outlet-uuid',
  items: [
    { batchId: 'batch-uuid', productId: 'product-uuid', direction: 'OUT', qty: 2, reason: 'DAMAGED' },
  ],
};

describe('CreateStockAdjustmentUseCase', () => {
  let useCase: CreateStockAdjustmentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateStockAdjustmentUseCase(mockAdjRepo, mockInvRepo);
    mockInvRepo.getBatchById.mockResolvedValue(batch());
    mockAdjRepo.createDraft.mockResolvedValue({ id: 'adj-1' } as never);
  });

  it('should verify each batch then create the draft', async () => {
    await useCase.execute(payload, 'c1', 'user-1');

    expect(mockInvRepo.getBatchById).toHaveBeenCalledWith('batch-uuid', 'c1');
    expect(mockAdjRepo.createDraft).toHaveBeenCalledWith(
      'c1',
      'user-1',
      expect.objectContaining({ outletId: 'outlet-uuid' }),
    );
  });

  it('should throw BATCH_OUTLET_MISMATCH when batch belongs to another outlet', async () => {
    mockInvRepo.getBatchById.mockResolvedValue(batch({ outletId: 'other-outlet' }));

    await expect(useCase.execute(payload, 'c1', 'user-1')).rejects.toThrow(
      'CREATE_STOCK_ADJUSTMENT.BATCH_OUTLET_MISMATCH',
    );
    expect(mockAdjRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should throw BATCH_PRODUCT_MISMATCH when product does not match', async () => {
    mockInvRepo.getBatchById.mockResolvedValue(batch({ productId: 'other-product' }));

    await expect(useCase.execute(payload, 'c1', 'user-1')).rejects.toThrow(
      'CREATE_STOCK_ADJUSTMENT.BATCH_PRODUCT_MISMATCH',
    );
  });

  it('should propagate batch-not-found from inventory repo', async () => {
    mockInvRepo.getBatchById.mockRejectedValue(new Error('INVENTORY_BATCH.NOT_FOUND'));

    await expect(useCase.execute(payload, 'c1', 'user-1')).rejects.toThrow(
      'INVENTORY_BATCH.NOT_FOUND',
    );
  });

  it('should reject invalid payload before touching repos', async () => {
    await expect(useCase.execute({ outletId: 'o1', items: [] }, 'c1', 'user-1')).rejects.toThrow(
      'CREATE_STOCK_ADJUSTMENT.ITEMS_REQUIRED',
    );
    expect(mockInvRepo.getBatchById).not.toHaveBeenCalled();
  });
});
