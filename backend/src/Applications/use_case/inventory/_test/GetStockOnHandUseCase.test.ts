import { GetStockOnHandUseCase } from '../GetStockOnHandUseCase';
import { InventoryRepository } from '../../../../Domains/inventory/InventoryRepository';

const mockInventoryRepository: jest.Mocked<InventoryRepository> = {
  getStockOnHand: jest.fn(),
  getLedger: jest.fn(),
  getBatches: jest.fn(),
  getBatchById: jest.fn(),
  planFefoAllocation: jest.fn(),
  postMovements: jest.fn(),
} as unknown as jest.Mocked<InventoryRepository>;

describe('GetStockOnHandUseCase', () => {
  let useCase: GetStockOnHandUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetStockOnHandUseCase(mockInventoryRepository);
    mockInventoryRepository.getStockOnHand.mockResolvedValue({ rows: [], total: 0 });
  });

  it('should delegate to repository with normalized filter', async () => {
    await useCase.execute(
      { limit: 20, offset: 0, outletId: 'o1', productId: 'p1', search: 'roti', lowOnly: true },
      'company-1',
    );

    expect(mockInventoryRepository.getStockOnHand).toHaveBeenCalledWith('company-1', {
      limit: 20,
      offset: 0,
      outletId: 'o1',
      productId: 'p1',
      search: 'roti',
      lowOnly: true,
    });
  });

  it('should return the repository result', async () => {
    const result = { rows: [], total: 5 };
    mockInventoryRepository.getStockOnHand.mockResolvedValue(result);

    const out = await useCase.execute({ limit: 10, offset: 0 }, 'company-1');
    expect(out).toBe(result);
  });
});
