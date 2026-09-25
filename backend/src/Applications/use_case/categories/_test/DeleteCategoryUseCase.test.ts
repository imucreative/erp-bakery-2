import { DeleteCategoryUseCase } from '../DeleteCategoryUseCase';
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

const existing = new ProductCategory({
  id: 'cat-uuid',
  companyId,
  productGroupId: 'pg-uuid',
  code: 'PC-001',
  name: 'Roti Manis',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('DeleteCategoryUseCase', () => {
  let useCase: DeleteCategoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteCategoryUseCase(mockRepo);
    mockRepo.getCategoryById.mockResolvedValue(existing);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should soft-delete when there are no dependents', async () => {
    await useCase.execute('cat-uuid', companyId);
    expect(mockRepo.softDeleteCategory).toHaveBeenCalledWith('cat-uuid', companyId);
  });

  it('should block deletion when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(1);
    await expect(useCase.execute('cat-uuid', companyId)).rejects.toThrow('CATEGORY.IN_USE');
    expect(mockRepo.softDeleteCategory).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND when the category does not exist', async () => {
    mockRepo.getCategoryById.mockRejectedValue(new Error('CATEGORY.NOT_FOUND'));
    await expect(useCase.execute('missing', companyId)).rejects.toThrow('CATEGORY.NOT_FOUND');
    expect(mockRepo.softDeleteCategory).not.toHaveBeenCalled();
  });
});
