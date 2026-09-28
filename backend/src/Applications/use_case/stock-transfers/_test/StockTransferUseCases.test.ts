import { CreateStockTransferUseCase } from '../CreateStockTransferUseCase';
import { SubmitStockTransferUseCase } from '../SubmitStockTransferUseCase';
import { DispatchStockTransferUseCase } from '../DispatchStockTransferUseCase';
import { ReceiveStockTransferUseCase } from '../ReceiveStockTransferUseCase';
import { CancelStockTransferUseCase } from '../CancelStockTransferUseCase';
import { GetStockTransfersUseCase } from '../GetStockTransfersUseCase';
import { StockTransferRepository } from '../../../../Domains/stock-transfers/StockTransferRepository';
import { InventoryRepository } from '../../../../Domains/inventory/InventoryRepository';
import { InventoryBatch } from '../../../../Domains/inventory/entities/InventoryBatch';

const trfRepo: jest.Mocked<StockTransferRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  submit: jest.fn(),
  cancel: jest.fn(),
  dispatch: jest.fn(),
  receive: jest.fn(),
} as unknown as jest.Mocked<StockTransferRepository>;

const invRepo: jest.Mocked<InventoryRepository> = {
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
    outletId: 'src-outlet',
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
  sourceOutletId: 'src-outlet',
  destinationOutletId: 'dst-outlet',
  items: [{ sourceBatchId: 'batch-uuid', productId: 'product-uuid', qty: 3 }],
};

beforeEach(() => jest.clearAllMocks());

describe('CreateStockTransferUseCase', () => {
  it('should verify source batches then create the draft', async () => {
    invRepo.getBatchById.mockResolvedValue(batch());
    trfRepo.createDraft.mockResolvedValue({ id: 't1' } as never);

    const useCase = new CreateStockTransferUseCase(trfRepo, invRepo);
    await useCase.execute(payload, 'c1', 'u1');

    expect(invRepo.getBatchById).toHaveBeenCalledWith('batch-uuid', 'c1');
    expect(trfRepo.createDraft).toHaveBeenCalledWith(
      'c1',
      'u1',
      expect.objectContaining({ sourceOutletId: 'src-outlet', destinationOutletId: 'dst-outlet' }),
    );
  });

  it('should throw BATCH_OUTLET_MISMATCH when source batch is in another outlet', async () => {
    invRepo.getBatchById.mockResolvedValue(batch({ outletId: 'other' }));

    const useCase = new CreateStockTransferUseCase(trfRepo, invRepo);
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow(
      'CREATE_STOCK_TRANSFER.BATCH_OUTLET_MISMATCH',
    );
    expect(trfRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should throw BATCH_PRODUCT_MISMATCH when product mismatches', async () => {
    invRepo.getBatchById.mockResolvedValue(batch({ productId: 'other-product' }));

    const useCase = new CreateStockTransferUseCase(trfRepo, invRepo);
    await expect(useCase.execute(payload, 'c1', 'u1')).rejects.toThrow(
      'CREATE_STOCK_TRANSFER.BATCH_PRODUCT_MISMATCH',
    );
  });

  it('should reject SAME_OUTLET before touching repos', async () => {
    const useCase = new CreateStockTransferUseCase(trfRepo, invRepo);
    await expect(
      useCase.execute({ ...payload, destinationOutletId: 'src-outlet' }, 'c1', 'u1'),
    ).rejects.toThrow('CREATE_STOCK_TRANSFER.SAME_OUTLET');
    expect(invRepo.getBatchById).not.toHaveBeenCalled();
  });
});

describe('Status use cases delegate to repository', () => {
  it('submit -> repo.submit', async () => {
    trfRepo.submit.mockResolvedValue({ id: 't' } as never);
    await new SubmitStockTransferUseCase(trfRepo).execute('t', 'c1', 'u1');
    expect(trfRepo.submit).toHaveBeenCalledWith('t', 'c1', 'u1');
  });

  it('dispatch -> repo.dispatch', async () => {
    trfRepo.dispatch.mockResolvedValue({ id: 't' } as never);
    await new DispatchStockTransferUseCase(trfRepo).execute('t', 'c1', 'u1');
    expect(trfRepo.dispatch).toHaveBeenCalledWith('t', 'c1', 'u1');
  });

  it('receive -> repo.receive', async () => {
    trfRepo.receive.mockResolvedValue({ id: 't' } as never);
    await new ReceiveStockTransferUseCase(trfRepo).execute('t', 'c1', 'u1');
    expect(trfRepo.receive).toHaveBeenCalledWith('t', 'c1', 'u1');
  });

  it('cancel -> repo.cancel', async () => {
    trfRepo.cancel.mockResolvedValue({ id: 't' } as never);
    await new CancelStockTransferUseCase(trfRepo).execute('t', 'c1', 'u1');
    expect(trfRepo.cancel).toHaveBeenCalledWith('t', 'c1', 'u1');
  });

  it('dispatch should propagate INSUFFICIENT_STOCK from repo', async () => {
    trfRepo.dispatch.mockRejectedValue(new Error('INVENTORY.INSUFFICIENT_STOCK'));
    await expect(
      new DispatchStockTransferUseCase(trfRepo).execute('t', 'c1', 'u1'),
    ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
  });
});

describe('GetStockTransfersUseCase', () => {
  it('should throw INVALID_STATUS for an unknown status', async () => {
    await expect(
      new GetStockTransfersUseCase(trfRepo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('STOCK_TRANSFER.INVALID_STATUS');
  });

  it('should list with a valid status', async () => {
    trfRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetStockTransfersUseCase(trfRepo).list(
      { limit: 10, offset: 0, status: 'IN_TRANSIT' },
      'c1',
    );
    expect(trfRepo.list).toHaveBeenCalled();
  });

  it('should return detail via getById', async () => {
    trfRepo.getById.mockResolvedValue({ id: 't' } as never);
    const result = await new GetStockTransfersUseCase(trfRepo).detail('t', 'c1');
    expect(result).toEqual({ id: 't' });
  });
});
