import { UpdateProductGroupUseCase } from '../UpdateProductGroupUseCase';
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

const updated = new ProductGroup({
  id: 'pg-uuid',
  companyId,
  code: 'PG-001',
  name: 'Renamed',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UpdateProductGroupUseCase', () => {
  let useCase: UpdateProductGroupUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateProductGroupUseCase(mockRepo);
    mockRepo.updateProductGroup.mockResolvedValue(updated);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should apply the update when fields are valid', async () => {
    const result = await useCase.execute('pg-uuid', { name: 'Renamed' }, companyId);

    expect(mockRepo.updateProductGroup).toHaveBeenCalledWith('pg-uuid', companyId, {
      name: 'Renamed',
    });
    expect(result.name).toBe('Renamed');
  });

  it('should allow deactivation when there are no dependents', async () => {
    await useCase.execute('pg-uuid', { isActive: false }, companyId);

    expect(mockRepo.countActiveDependents).toHaveBeenCalledWith('pg-uuid', companyId);
    expect(mockRepo.updateProductGroup).toHaveBeenCalledWith('pg-uuid', companyId, {
      isActive: false,
    });
  });

  it('should block deactivation when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(2);

    await expect(
      useCase.execute('pg-uuid', { isActive: false }, companyId),
    ).rejects.toThrow('PRODUCT_GROUP.IN_USE');
    expect(mockRepo.updateProductGroup).not.toHaveBeenCalled();
  });

  it('should not check dependents when only renaming', async () => {
    await useCase.execute('pg-uuid', { name: 'Renamed' }, companyId);
    expect(mockRepo.countActiveDependents).not.toHaveBeenCalled();
  });

  it('should throw when payload has no updatable field', async () => {
    await expect(useCase.execute('pg-uuid', {}, companyId)).rejects.toThrow(
      'UPDATE_PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
