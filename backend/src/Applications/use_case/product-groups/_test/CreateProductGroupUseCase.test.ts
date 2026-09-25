import { CreateProductGroupUseCase } from '../CreateProductGroupUseCase';
import { ProductGroupRepository } from '../../../../Domains/product-groups/ProductGroupRepository';
import { ProductGroup } from '../../../../Domains/product-groups/entities/ProductGroup';

const mockRepo: jest.Mocked<ProductGroupRepository> = {
  addProductGroup: jest.fn(),
  generateProductGroupCode: jest.fn(),
  getProductGroupsByCompany: jest.fn(),
  getProductGroupById: jest.fn(),
  updateProductGroup: jest.fn(),
  softDeleteProductGroup: jest.fn(),
  countActiveDependents: jest.fn(),
} as unknown as jest.Mocked<ProductGroupRepository>;

const companyId = 'company-uuid';

const created = new ProductGroup({
  id: 'pg-uuid',
  companyId,
  code: 'PG-001',
  name: 'Bahan Baku',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CreateProductGroupUseCase', () => {
  let useCase: CreateProductGroupUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateProductGroupUseCase(mockRepo);
    mockRepo.generateProductGroupCode.mockResolvedValue('PG-001');
    mockRepo.addProductGroup.mockResolvedValue(created);
  });

  it('should generate a code and persist the product group', async () => {
    const result = await useCase.execute({ name: 'Bahan Baku' }, companyId);

    expect(mockRepo.generateProductGroupCode).toHaveBeenCalledWith(companyId);
    expect(mockRepo.addProductGroup).toHaveBeenCalledWith(
      { code: 'PG-001', name: 'Bahan Baku', description: null },
      companyId,
    );
    expect(result.code).toBe('PG-001');
  });

  it('should pass through trimmed description', async () => {
    await useCase.execute({ name: 'Bahan Baku', description: '  desc  ' }, companyId);

    expect(mockRepo.addProductGroup).toHaveBeenCalledWith(
      { code: 'PG-001', name: 'Bahan Baku', description: 'desc' },
      companyId,
    );
  });

  it('should throw when payload is invalid (domain validation)', async () => {
    await expect(useCase.execute({ name: '' }, companyId)).rejects.toThrow(
      'CREATE_PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockRepo.addProductGroup).not.toHaveBeenCalled();
  });
});
