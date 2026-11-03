import { GetBatchesUseCase } from '../GetBatchesUseCase';
import { InventoryRepository } from '../../../../Domains/inventory/InventoryRepository';
import { InventoryBatch } from '../../../../Domains/inventory/entities/InventoryBatch';

const mockInventoryRepository: jest.Mocked<InventoryRepository> = {
  getStockOnHand: jest.fn(),
  getLedger: jest.fn(),
  getBatches: jest.fn(),
  getBatchById: jest.fn(),
  planFefoAllocation: jest.fn(),
  postMovements: jest.fn(),
} as unknown as jest.Mocked<InventoryRepository>;

function makeBatch(overrides: Partial<ConstructorParameters<typeof InventoryBatch>[0]> = {}) {
  return new InventoryBatch({
    id: 'b1',
    companyId: 'c1',
    outletId: 'o1',
    productId: 'p1',
    batchNumber: 'B-1',
    lotKey: '',
    expiredDate: new Date('2026-06-20'),
    qtyAvailable: 5,
    status: 'ACTIVE',
    ...overrides,
  });
}

describe('GetBatchesUseCase', () => {
  let useCase: GetBatchesUseCase;
  const businessDate = new Date('2026-06-15T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetBatchesUseCase(mockInventoryRepository);
  });

  it('should attach derived expiry state to each batch', async () => {
    mockInventoryRepository.getBatches.mockResolvedValue({
      rows: [
        makeBatch({ id: 'soon', expiredDate: new Date('2026-06-20') }), // within 30d
        makeBatch({ id: 'expired', expiredDate: new Date('2026-06-10') }), // before
      ],
      total: 2,
    });

    const result = await useCase.execute({ limit: 10, offset: 0 }, 'company-1', businessDate);

    expect(result.total).toBe(2);
    expect(result.rows[0].expiryState).toBe('EXPIRING_SOON');
    expect(result.rows[1].expiryState).toBe('EXPIRED');
  });

  it.each([
    {
      id: 'active',
      status: 'ACTIVE' as const,
      expiredDate: new Date('2026-06-10'),
      expected: 'EXPIRED',
    },
    {
      id: 'held',
      status: 'QUARANTINE' as const,
      expiredDate: new Date('2026-06-20'),
      expected: 'QUARANTINE',
    },
    {
      id: 'depleted',
      status: 'CONSUMED' as const,
      expiredDate: new Date('2026-06-10'),
      expected: 'CONSUMED',
    },
    {
      id: 'stored-expired',
      status: 'EXPIRED' as const,
      expiredDate: new Date('2026-12-10'),
      expected: 'EXPIRED',
    },
  ])(
    'derives $id operational status without touching the stored status',
    async ({ status, expiredDate, expected }) => {
      mockInventoryRepository.getBatches.mockResolvedValue({
        rows: [makeBatch({ id: 'one', status, expiredDate })],
        total: 1,
      });

      const { rows } = await useCase.execute({ limit: 10, offset: 0 }, 'company-1', businessDate);

      expect(rows[0].operationalStatus).toBe(expected);
      expect(rows[0].batch.status).toBe(status);
      expect(rows[0].batch.qtyAvailable).toBe(5);
    },
  );

  it('should mark non-batch rows as NOT_APPLICABLE and keep their stored status', async () => {
    mockInventoryRepository.getBatches.mockResolvedValue({
      rows: [makeBatch({ id: 'nb', isNonBatch: true, expiredDate: null })],
      total: 1,
    });

    const { rows } = await useCase.execute(
      { limit: 10, offset: 0, includeNonBatch: true },
      'company-1',
      businessDate,
    );

    expect(rows[0].expiryState).toBe('NOT_APPLICABLE');
    expect(rows[0].operationalStatus).toBe('ACTIVE');
  });

  it('should pass the business date and default includeNonBatch to false', async () => {
    mockInventoryRepository.getBatches.mockResolvedValue({ rows: [], total: 0 });

    await useCase.execute({ limit: 10, offset: 0 }, 'company-1', businessDate);

    expect(mockInventoryRepository.getBatches).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ includeNonBatch: false, operationalStatus: undefined }),
      businessDate,
    );
  });

  it('forwards the operational status filter separately from the stored status filter', async () => {
    mockInventoryRepository.getBatches.mockResolvedValue({ rows: [], total: 0 });

    await useCase.execute(
      { limit: 10, offset: 0, status: 'ACTIVE', operationalStatus: 'EXPIRED' },
      'company-1',
      businessDate,
    );

    expect(mockInventoryRepository.getBatches).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ status: 'ACTIVE', operationalStatus: 'EXPIRED' }),
      businessDate,
    );
  });

  it('should throw INVALID_BATCH_STATUS for an unknown status', async () => {
    await expect(
      useCase.execute({ limit: 10, offset: 0, status: 'BOGUS' }, 'company-1', businessDate),
    ).rejects.toThrow('INVENTORY.INVALID_BATCH_STATUS');
    expect(mockInventoryRepository.getBatches).not.toHaveBeenCalled();
  });

  it('should throw INVALID_BATCH_STATUS for an unknown operational status', async () => {
    await expect(
      useCase.execute(
        { limit: 10, offset: 0, operationalStatus: 'BOGUS' },
        'company-1',
        businessDate,
      ),
    ).rejects.toThrow('INVENTORY.INVALID_BATCH_STATUS');
    expect(mockInventoryRepository.getBatches).not.toHaveBeenCalled();
  });
});
