import { PlanFefoAllocationUseCase } from '../PlanFefoAllocationUseCase';
import { InventoryRepository, FefoAllocation } from '../../../../Domains/inventory/InventoryRepository';

const mockInventoryRepository: jest.Mocked<InventoryRepository> = {
  getStockOnHand: jest.fn(),
  getLedger: jest.fn(),
  getBatches: jest.fn(),
  getBatchById: jest.fn(),
  planFefoAllocation: jest.fn(),
  postMovements: jest.fn(),
} as unknown as jest.Mocked<InventoryRepository>;

describe('PlanFefoAllocationUseCase', () => {
  let useCase: PlanFefoAllocationUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new PlanFefoAllocationUseCase(mockInventoryRepository);
  });

  it('should delegate to repository and return the allocation plan', async () => {
    const plan: FefoAllocation[] = [
      { batchId: 'b1', batchNumber: 'B-1', lotKey: '', expiredDate: new Date('2026-01-01'), qty: 3 },
      { batchId: 'b2', batchNumber: 'B-2', lotKey: '', expiredDate: new Date('2026-02-01'), qty: 2 },
    ];
    mockInventoryRepository.planFefoAllocation.mockResolvedValue(plan);

    const result = await useCase.execute(
      { outletId: 'o1', productId: 'p1', qty: 5 },
      'company-1',
    );

    expect(result).toEqual(plan);
    expect(mockInventoryRepository.planFefoAllocation).toHaveBeenCalledWith(
      'company-1',
      'o1',
      'p1',
      5,
      expect.any(Date),
    );
  });

  it('should pass through the provided business date', async () => {
    mockInventoryRepository.planFefoAllocation.mockResolvedValue([]);
    const businessDate = new Date('2026-06-15');

    await useCase.execute({ outletId: 'o1', productId: 'p1', qty: 1 }, 'company-1', businessDate);

    expect(mockInventoryRepository.planFefoAllocation).toHaveBeenCalledWith(
      'company-1',
      'o1',
      'p1',
      1,
      businessDate,
    );
  });

  it('should throw QTY_MUST_BE_POSITIVE for zero qty', async () => {
    await expect(
      useCase.execute({ outletId: 'o1', productId: 'p1', qty: 0 }, 'company-1'),
    ).rejects.toThrow('FEFO.QTY_MUST_BE_POSITIVE');
    expect(mockInventoryRepository.planFefoAllocation).not.toHaveBeenCalled();
  });

  it('should throw QTY_MUST_BE_POSITIVE for negative qty', async () => {
    await expect(
      useCase.execute({ outletId: 'o1', productId: 'p1', qty: -3 }, 'company-1'),
    ).rejects.toThrow('FEFO.QTY_MUST_BE_POSITIVE');
  });

  it('should throw QTY_NOT_MEET_DATA_TYPE_SPECIFICATION for non-number qty', async () => {
    await expect(
      useCase.execute(
        { outletId: 'o1', productId: 'p1', qty: 'x' as unknown as number },
        'company-1',
      ),
    ).rejects.toThrow('FEFO.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should throw QTY_NOT_MEET_DATA_TYPE_SPECIFICATION for NaN/Infinity', async () => {
    await expect(
      useCase.execute({ outletId: 'o1', productId: 'p1', qty: Infinity }, 'company-1'),
    ).rejects.toThrow('FEFO.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when outletId missing', async () => {
    await expect(
      useCase.execute({ outletId: '', productId: 'p1', qty: 1 }, 'company-1'),
    ).rejects.toThrow('FEFO.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should propagate INSUFFICIENT_STOCK from repository', async () => {
    mockInventoryRepository.planFefoAllocation.mockRejectedValue(
      new Error('INVENTORY.INSUFFICIENT_STOCK'),
    );

    await expect(
      useCase.execute({ outletId: 'o1', productId: 'p1', qty: 999 }, 'company-1'),
    ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
  });
});
