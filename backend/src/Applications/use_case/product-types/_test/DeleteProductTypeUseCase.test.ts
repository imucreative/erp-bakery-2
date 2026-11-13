import { DeleteProductTypeUseCase } from '../DeleteProductTypeUseCase';
import { ProductTypeRepository } from '../../../../Domains/product-types/ProductTypeRepository';
import { ProductType } from '../../../../Domains/product-types/entities/ProductType';

const mockRepo = {
  getByCode: jest.fn(),
  deleteProductType: jest.fn(),
} as unknown as jest.Mocked<ProductTypeRepository>;

const existing = new ProductType({
  code: 'FINISHED_GOODS',
  name: 'Barang Jadi',
});

describe('DeleteProductTypeUseCase', () => {
  let useCase: DeleteProductTypeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteProductTypeUseCase(mockRepo);
    mockRepo.getByCode.mockResolvedValue(existing);
    mockRepo.deleteProductType.mockResolvedValue(undefined);
  });

  it('should verify the row exists then delete it', async () => {
    await useCase.execute('FINISHED_GOODS');
    expect(mockRepo.getByCode).toHaveBeenCalledWith('FINISHED_GOODS');
    expect(mockRepo.deleteProductType).toHaveBeenCalledWith('FINISHED_GOODS');
  });

  it('should propagate not-found errors', async () => {
    mockRepo.getByCode.mockRejectedValue(new Error('PRODUCT_TYPE.NOT_FOUND'));
    await expect(useCase.execute('UNKNOWN')).rejects.toThrow('PRODUCT_TYPE.NOT_FOUND');
    expect(mockRepo.deleteProductType).not.toHaveBeenCalled();
  });

  it('should propagate in-use conflicts', async () => {
    mockRepo.deleteProductType.mockRejectedValue(new Error('PRODUCT_TYPE.IN_USE'));
    await expect(useCase.execute('FINISHED_GOODS')).rejects.toThrow('PRODUCT_TYPE.IN_USE');
  });
});
