import { UpdateCategoryUseCase } from '../UpdateCategoryUseCase';
import { CategoryRepository } from '../../../../Domains/categories/CategoryRepository';
import { ProductCategory } from '../../../../Domains/categories/entities/ProductCategory';

const mockRepo: jest.Mocked<CategoryRepository> = {
  addCategory: jest.fn(),
  generateCategoryCode: jest.fn(),
  getCategoriesByCompany: jest.fn(),
  getCategoryById: jest.fn(),
  updateCategory: jest.fn(),
  softDeleteCategory: jest.fn(),
  countActiveDependents: jest.fn(),
} as unknown as jest.Mocked<CategoryRepository>;

const companyId = 'company-uuid';

const updated = new ProductCategory({
  id: 'cat-uuid',
  companyId,
  productGroupId: 'pg-uuid',
  code: 'PC-001',
  name: 'Roti Baru',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateCategoryUseCase(mockRepo);
    mockRepo.updateCategory.mockResolvedValue(updated);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should apply the update when fields are valid', async () => {
    const result = await useCase.execute('cat-uuid', { name: 'Roti Baru' }, companyId);
    expect(mockRepo.updateCategory).toHaveBeenCalledWith('cat-uuid', companyId, {
      name: 'Roti Baru',
    });
    expect(result.name).toBe('Roti Baru');
  });

  it('should allow deactivation when there are no dependents', async () => {
    await useCase.execute('cat-uuid', { isActive: false }, companyId);
    expect(mockRepo.countActiveDependents).toHaveBeenCalledWith('cat-uuid', companyId);
    expect(mockRepo.updateCategory).toHaveBeenCalled();
  });

  it('should block deactivation when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(2);
    await expect(useCase.execute('cat-uuid', { isActive: false }, companyId)).rejects.toThrow(
      'CATEGORY.IN_USE',
    );
    expect(mockRepo.updateCategory).not.toHaveBeenCalled();
  });

  it('should throw when payload has no updatable field', async () => {
    await expect(useCase.execute('cat-uuid', {}, companyId)).rejects.toThrow(
      'UPDATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
