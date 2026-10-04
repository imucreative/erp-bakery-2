import { DeleteToppingUseCase } from '../DeleteToppingUseCase';
import { ToppingRepository } from '../../../../Domains/toppings/ToppingRepository';

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

describe('DeleteToppingUseCase', () => {
  let useCase: DeleteToppingUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteToppingUseCase(mockToppingRepo);
  });

  it('should delete the catalog entry via the repository', async () => {
    mockToppingRepo.remove.mockResolvedValue(undefined);
    await useCase.execute(id, companyId);
    expect(mockToppingRepo.remove).toHaveBeenCalledWith(id, companyId);
  });

  it('should propagate TOPPING.NOT_FOUND from the repository', async () => {
    mockToppingRepo.remove.mockRejectedValue(new Error('TOPPING.NOT_FOUND'));
    await expect(useCase.execute(id, companyId)).rejects.toThrow('TOPPING.NOT_FOUND');
  });
});
