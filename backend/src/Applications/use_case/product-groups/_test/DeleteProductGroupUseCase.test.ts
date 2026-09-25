import { DeleteProductGroupUseCase } from '../DeleteProductGroupUseCase';
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

const existing = new ProductGroup({
  id: 'pg-uuid',
  companyId,
  code: 'PG-001',
  name: 'Bahan Baku',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('DeleteProductGroupUseCase', () => {
  let useCase: DeleteProductGroupUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteProductGroupUseCase(mockRepo);
    mockRepo.getProductGroupById.mockResolvedValue(existing);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should soft-delete when there are no dependents', async () => {
    await useCase.execute('pg-uuid', companyId);

    expect(mockRepo.getProductGroupById).toHaveBeenCalledWith('pg-uuid', companyId);
    expect(mockRepo.countActiveDependents).toHaveBeenCalledWith('pg-uuid', companyId);
    expect(mockRepo.softDeleteProductGroup).toHaveBeenCalledWith('pg-uuid', companyId);
  });

  it('should block deletion when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(1);

    await expect(useCase.execute('pg-uuid', companyId)).rejects.toThrow(
      'PRODUCT_GROUP.IN_USE',
    );
    expect(mockRepo.softDeleteProductGroup).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND when the group does not exist', async () => {
    mockRepo.getProductGroupById.mockRejectedValue(new Error('PRODUCT_GROUP.NOT_FOUND'));

    await expect(useCase.execute('missing', companyId)).rejects.toThrow(
      'PRODUCT_GROUP.NOT_FOUND',
    );
    expect(mockRepo.softDeleteProductGroup).not.toHaveBeenCalled();
  });
});
