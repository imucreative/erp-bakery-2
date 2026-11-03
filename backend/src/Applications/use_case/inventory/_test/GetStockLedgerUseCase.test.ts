import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetStockLedgerUseCase } from '../GetStockLedgerUseCase';
import { InventoryRepository } from '../../../../Domains/inventory/InventoryRepository';
import { InvariantError } from '../../../../Commons/exceptions/InvariantError';
import { LedgerQueryDto } from '../../../../Interfaces/http/api/inventory/dto/ledger-query.dto';

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
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it.each(['PURCHASE', 'SALE_RETURN', 'RETURN'])(
    'should accept %s without rewriting it',
    async (movementType) => {
      await useCase.execute({ limit: 10, offset: 0, movementType }, 'company-1');
      expect(mockInventoryRepository.getLedger).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({ movementType }),
      );
    },
  );

  it('passes date-only strings and all other filters through unchanged', async () => {
    const query = {
      limit: 5,
      offset: 10,
      outletId: 'o1',
      productId: 'p1',
      batchId: 'b1',
      movementType: 'SALE_RETURN',
      dateFrom: '2026-10-24',
      dateTo: '2026-10-25',
    };
    const expected = { rows: [], total: 7 };
    mockInventoryRepository.getLedger.mockResolvedValue(expected);
    expect(await useCase.execute(query, 'company-1')).toBe(expected);
    expect(mockInventoryRepository.getLedger).toHaveBeenCalledTimes(1);
    expect(mockInventoryRepository.getLedger).toHaveBeenCalledWith('company-1', query);
  });

  it.each([
    { dateFrom: '2026-10-25', dateTo: '2026-10-25' },
    { dateFrom: '2026-10-25' },
    { dateTo: '2026-10-25' },
    {},
  ])('accepts same-day, open or absent ranges: %j', async (dates) => {
    await useCase.execute({ limit: 10, offset: 0, ...dates }, 'company-1');
    expect(mockInventoryRepository.getLedger).toHaveBeenCalledTimes(1);
    expect(mockInventoryRepository.getLedger).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ dateFrom: undefined, dateTo: undefined, ...dates }),
    );
  });

  it('rejects an inverted range with the Indonesian InvariantError before repository access', async () => {
    const execution = useCase.execute(
      { limit: 10, offset: 0, dateFrom: '2026-10-26', dateTo: '2026-10-25' },
      'company-1',
    );
    await expect(execution).rejects.toBeInstanceOf(InvariantError);
    await expect(execution).rejects.toThrow(
      'Dari tanggal tidak boleh melewati sampai tanggal. Periksa kembali rentang tanggal.',
    );
    expect(mockInventoryRepository.getLedger).not.toHaveBeenCalled();
  });

  it('should throw INVALID_MOVEMENT_TYPE for an unknown type', async () => {
    await expect(
      useCase.execute({ limit: 10, offset: 0, movementType: 'NOPE' }, 'company-1'),
    ).rejects.toThrow('INVENTORY.INVALID_MOVEMENT_TYPE');
    expect(mockInventoryRepository.getLedger).not.toHaveBeenCalled();
  });
});

describe('LedgerQueryDto date validation', () => {
  it.each([
    {},
    { dateFrom: '2026-10-25' },
    { dateTo: '2026-10-25' },
    { dateFrom: '2026-10-25', dateTo: '2026-10-25', movementType: 'SALE_RETURN' },
    { dateFrom: '2024-02-29', dateTo: '2024-03-01' },
  ])('accepts optional dates and valid calendar dates: %j', async (query) => {
    const dto = plainToInstance(LedgerQueryDto, query);
    expect(dto).toBeInstanceOf(LedgerQueryDto);
    expect(await validate(dto)).toEqual([]);
    expect(dto).toEqual(expect.objectContaining(query));
  });

  describe.each(['dateFrom', 'dateTo'] as const)('%s', (field) => {
    it.each([
      '',
      'not-a-date',
      '25/10/2026',
      '2026-1-05',
      '2026-10-5',
      '2026-00-10',
      '2026-13-01',
      '2026-10-00',
      '2026-10-32',
      '2026-02-29',
      '2026-02-30',
      '2026-04-31',
      '2026-10-25T00:00:00Z',
      '2026-10-25T00:00:00+07:00',
      '2026-10-25T00:00:00',
      '2026-10-25 00:00:00',
      ' 2026-10-25',
      '2026-10-25 ',
    ])('rejects malformed/impossible/date-time input %j', async (value) => {
      const dto = plainToInstance(LedgerQueryDto, { [field]: value });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
      expect(Object.keys(errors[0].constraints ?? {})).toEqual(
        expect.arrayContaining([/^\d{4}-\d{2}-\d{2}$/.test(value) ? 'isDateString' : 'matches']),
      );
    });
  });
});
