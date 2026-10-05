import { UpdateToppingUseCase } from '../UpdateToppingUseCase';
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
const id = 'topping-row-uuid';
const userId = 'user-uuid';
const now = new Date();

const updated = new Topping({
  id,
  companyId,
  toppingProductId: 'topping-uuid',
  defaultQtyPerItem: 30,
  extraPrice: 2500,
  sortOrder: 1,
  isActive: false,
  createdAt: now,
  updatedAt: now,
});

describe('UpdateToppingUseCase', () => {
  let useCase: UpdateToppingUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateToppingUseCase(mockToppingRepo);
    mockToppingRepo.update.mockResolvedValue(updated);
  });

  it('should validate and forward the updatable fields to the repository', async () => {
    const result = await useCase.execute(
      id,
      { defaultQtyPerItem: 30, extraPrice: 2500, sortOrder: 1, isActive: false },
      companyId,
      userId,
    );

    expect(mockToppingRepo.update).toHaveBeenCalledWith(
      id,
      companyId,
      { defaultQtyPerItem: 30, extraPrice: 2500, sortOrder: 1, isActive: false },
      userId,
    );
    expect(result.defaultQtyPerItem).toBe(30);
  });

  it('should reject a non-positive qty', async () => {
    await expect(
      useCase.execute(id, { defaultQtyPerItem: 0 }, companyId, userId),
    ).rejects.toThrow('UPDATE_TOPPING.QTY_MUST_BE_POSITIVE');
    expect(mockToppingRepo.update).not.toHaveBeenCalled();
  });

  it('should reject a negative extra price', async () => {
    await expect(
      useCase.execute(id, { extraPrice: -1 }, companyId, userId),
    ).rejects.toThrow('UPDATE_TOPPING.EXTRA_PRICE_MUST_BE_NON_NEGATIVE');
    expect(mockToppingRepo.update).not.toHaveBeenCalled();
  });

  it('should reject an empty payload (no updatable fields)', async () => {
    await expect(useCase.execute(id, {}, companyId, userId)).rejects.toThrow(
      'UPDATE_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockToppingRepo.update).not.toHaveBeenCalled();
  });

  it('should propagate TOPPING.NOT_FOUND from the repository', async () => {
    mockToppingRepo.update.mockRejectedValue(new Error('TOPPING.NOT_FOUND'));
    await expect(
      useCase.execute(id, { isActive: true }, companyId, userId),
    ).rejects.toThrow('TOPPING.NOT_FOUND');
  });
});
