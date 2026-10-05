import { GetToppingsUseCase } from '../GetToppingsUseCase';
import { ToppingRepository } from '../../../../Domains/toppings/ToppingRepository';
import { Topping } from '../../../../Domains/toppings/entities/Topping';

const mockToppingRepo = {
  list: jest.fn(),
  listActive: jest.fn(),
  getById: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
} as unknown as jest.Mocked<ToppingRepository>;

const companyId = 'company-uuid';
const now = new Date();

const topping = new Topping({
  id: 'topping-row-uuid',
  companyId,
  toppingProductId: 'topping-uuid',
  defaultQtyPerItem: 25,
  extraPrice: 2000,
  sortOrder: 0,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

describe('GetToppingsUseCase', () => {
  let useCase: GetToppingsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetToppingsUseCase(mockToppingRepo);
  });

  it('list should return the whole catalog via the repository', async () => {
    mockToppingRepo.list.mockResolvedValue([topping]);
    const result = await useCase.list(companyId);
    expect(mockToppingRepo.list).toHaveBeenCalledWith(companyId);
    expect(result).toHaveLength(1);
  });

  it('detail should return a single entry via the repository', async () => {
    mockToppingRepo.getById.mockResolvedValue(topping);
    const result = await useCase.detail('topping-row-uuid', companyId);
    expect(mockToppingRepo.getById).toHaveBeenCalledWith('topping-row-uuid', companyId);
    expect(result.id).toBe('topping-row-uuid');
  });

  it('listActive should return only active entries via the repository', async () => {
    mockToppingRepo.listActive.mockResolvedValue([topping]);
    const result = await useCase.listActive(companyId);
    expect(mockToppingRepo.listActive).toHaveBeenCalledWith(companyId);
    expect(result).toHaveLength(1);
  });

  it('detail should propagate TOPPING.NOT_FOUND from the repository', async () => {
    mockToppingRepo.getById.mockRejectedValue(new Error('TOPPING.NOT_FOUND'));
    await expect(useCase.detail('x', companyId)).rejects.toThrow('TOPPING.NOT_FOUND');
  });
});
