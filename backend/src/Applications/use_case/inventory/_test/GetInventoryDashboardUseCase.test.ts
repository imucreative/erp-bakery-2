import { GetInventoryDashboardUseCase } from '../GetInventoryDashboardUseCase';
import { InventoryRepository } from '../../../../Domains/inventory/InventoryRepository';

const mockInventoryRepository: jest.Mocked<InventoryRepository> = {
  getStockOnHand: jest.fn(),
  getLedger: jest.fn(),
  getBatches: jest.fn(),
  getBatchById: jest.fn(),
  planFefoAllocation: jest.fn(),
  postMovements: jest.fn(),
  getDashboardSummary: jest.fn(),
} as unknown as jest.Mocked<InventoryRepository>;

describe('GetInventoryDashboardUseCase', () => {
  let useCase: GetInventoryDashboardUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetInventoryDashboardUseCase(mockInventoryRepository);
  });

  it('should delegate to repository and return the summary', async () => {
    const summary = {
      totalActiveBatches: 10,
      totalProductsInStock: 8,
      lowStockCount: 2,
      expiringSoonCount: 3,
      expiredCount: 1,
      inTransitTransfers: 1,
    };
    mockInventoryRepository.getDashboardSummary.mockResolvedValue(summary);

    const result = await useCase.execute('c1', 'outlet-1');

    expect(result).toBe(summary);
    expect(mockInventoryRepository.getDashboardSummary).toHaveBeenCalledWith(
      'c1',
      expect.any(Date),
      'outlet-1',
    );
  });

  it('should pass undefined outlet when not provided', async () => {
    mockInventoryRepository.getDashboardSummary.mockResolvedValue({
      totalActiveBatches: 0,
      totalProductsInStock: 0,
      lowStockCount: 0,
      expiringSoonCount: 0,
      expiredCount: 0,
      inTransitTransfers: 0,
    });

    await useCase.execute('c1');

    expect(mockInventoryRepository.getDashboardSummary).toHaveBeenCalledWith(
      'c1',
      expect.any(Date),
      undefined,
    );
  });
});
