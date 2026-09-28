import { GetStockLedgerUseCase } from '../GetStockLedgerUseCase';
import { InventoryRepository } from '../../../../Domains/inventory/InventoryRepository';

const mockInventoryRepository: jest.Mocked<InventoryRepository> = {
  getStockOnHand: jest.fn(),
  getLedger: jest.fn(),
  getBatches: jest.fn(),
  getBatchById: jest.fn(),
  planFefoAllocation: jest.fn(),
  postMovements: jest.fn(),
} as unknown as jest.Mocked<InventoryRepository>;

describe('GetStockLedgerUseCase', () => {
  let useCase: GetStockLedgerUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetStockLedgerUseCase(mockInventoryRepository);
    mockInventoryRepository.getLedger.mockResolvedValue({ rows: [], total: 0 });
  });

  it('should delegate to repository with the filter', async () => {
    await useCase.execute({ limit: 10, offset: 0, outletId: 'o1' }, 'company-1');

    expect(mockInventoryRepository.getLedger).toHaveBeenCalledWith('company-1', {
      limit: 10,
      offset: 0,
      outletId: 'o1',
      productId: undefined,
      batchId: undefined,
      movementType: undefined,
    });
  });

  it('should accept a valid movement type filter', async () => {
    await useCase.execute({ limit: 10, offset: 0, movementType: 'PURCHASE' }, 'company-1');
    expect(mockInventoryRepository.getLedger).toHaveBeenCalled();
  });

  it('should throw INVALID_MOVEMENT_TYPE for an unknown type', async () => {
    await expect(
      useCase.execute({ limit: 10, offset: 0, movementType: 'NOPE' }, 'company-1'),
    ).rejects.toThrow('INVENTORY.INVALID_MOVEMENT_TYPE');
    expect(mockInventoryRepository.getLedger).not.toHaveBeenCalled();
  });
});
