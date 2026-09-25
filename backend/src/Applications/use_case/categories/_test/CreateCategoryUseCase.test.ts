import { CreateCategoryUseCase } from '../CreateCategoryUseCase';
import { CategoryRepository } from '../../../../Domains/categories/CategoryRepository';
import { ProductCategory } from '../../../../Domains/categories/entities/ProductCategory';
import { ProductGroupRepository } from '../../../../Domains/product-groups/ProductGroupRepository';
import { ProductGroup } from '../../../../Domains/product-groups/entities/ProductGroup';

const mockCategoryRepo: jest.Mocked<CategoryRepository> = {
  addCategory: jest.fn(),
  generateCategoryCode: jest.fn(),
  getCategoriesByCompany: jest.fn(),
  getCategoryById: jest.fn(),
  updateCategory: jest.fn(),
  softDeleteCategory: jest.fn(),
  countActiveDependents: jest.fn(),
} as unknown as jest.Mocked<CategoryRepository>;

const mockProductGroupRepo: jest.Mocked<ProductGroupRepository> = {
  getProductGroupById: jest.fn(),
} as unknown as jest.Mocked<ProductGroupRepository>;

const companyId = 'company-uuid';
const productGroupId = 'pg-uuid';

const activeGroup = new ProductGroup({
  id: productGroupId,
  companyId,
  code: 'PG-001',
  name: 'Bakery',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const created = new ProductCategory({
  id: 'cat-uuid',
  companyId,
  productGroupId,
  code: 'PC-001',
  name: 'Roti Manis',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateCategoryUseCase(mockCategoryRepo, mockProductGroupRepo);
    mockProductGroupRepo.getProductGroupById.mockResolvedValue(activeGroup);
    mockCategoryRepo.generateCategoryCode.mockResolvedValue('PC-001');
    mockCategoryRepo.addCategory.mockResolvedValue(created);
  });

  it('should validate the group, generate a code, and persist the category', async () => {
    const result = await useCase.execute(
      { productGroupId, name: 'Roti Manis' },
      companyId,
    );

    expect(mockProductGroupRepo.getProductGroupById).toHaveBeenCalledWith(
      productGroupId,
      companyId,
    );
    expect(mockCategoryRepo.generateCategoryCode).toHaveBeenCalledWith(companyId);
    expect(mockCategoryRepo.addCategory).toHaveBeenCalledWith(
      { code: 'PC-001', name: 'Roti Manis', description: null, productGroupId },
      companyId,
    );
    expect(result.code).toBe('PC-001');
  });

  it('should pass through trimmed description', async () => {
    await useCase.execute(
      { productGroupId, name: 'Roti', description: '  Kategori  ' },
      companyId,
    );
    expect(mockCategoryRepo.addCategory).toHaveBeenCalledWith(
      { code: 'PC-001', name: 'Roti', description: 'Kategori', productGroupId },
      companyId,
    );
  });

  it('should throw when the product group is inactive', async () => {
    mockProductGroupRepo.getProductGroupById.mockResolvedValue({
      ...activeGroup,
      isActive: false,
    } as ProductGroup);

    await expect(
      useCase.execute({ productGroupId, name: 'Roti' }, companyId),
    ).rejects.toThrow('CREATE_CATEGORY.PRODUCT_GROUP_INACTIVE');
    expect(mockCategoryRepo.addCategory).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND when the group is missing or foreign', async () => {
    mockProductGroupRepo.getProductGroupById.mockRejectedValue(
      new Error('PRODUCT_GROUP.NOT_FOUND'),
    );

    await expect(
      useCase.execute({ productGroupId, name: 'Roti' }, companyId),
    ).rejects.toThrow('PRODUCT_GROUP.NOT_FOUND');
    expect(mockCategoryRepo.addCategory).not.toHaveBeenCalled();
  });

  it('should throw when payload is invalid', async () => {
    await expect(useCase.execute({ productGroupId, name: '' }, companyId)).rejects.toThrow(
      'CREATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockCategoryRepo.addCategory).not.toHaveBeenCalled();
  });
});
