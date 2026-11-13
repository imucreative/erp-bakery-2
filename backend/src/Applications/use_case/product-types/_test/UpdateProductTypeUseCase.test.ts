import { UpdateProductTypeUseCase } from '../UpdateProductTypeUseCase';
import { ProductTypeRepository } from '../../../../Domains/product-types/ProductTypeRepository';
import { ProductType } from '../../../../Domains/product-types/entities/ProductType';

const mockRepo = {
  updateProductType: jest.fn(),
} as unknown as jest.Mocked<ProductTypeRepository>;

const updated = new ProductType({
  code: 'FINISHED_GOODS',
  name: 'Barang Jadi Baru',
  description: 'Deskripsi',
  sortOrder: 20,
  isActive: false,
});

describe('UpdateProductTypeUseCase', () => {
  let useCase: UpdateProductTypeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateProductTypeUseCase(mockRepo);
    mockRepo.updateProductType.mockResolvedValue(updated);
  });

  it('should normalise fields and update by code', async () => {
    const result = await useCase.execute('FINISHED_GOODS', {
      name: ' Barang Jadi Baru ',
      description: ' Deskripsi ',
      sortOrder: 20,
      isActive: false,
    });

    expect(mockRepo.updateProductType).toHaveBeenCalledWith('FINISHED_GOODS', {
      name: 'Barang Jadi Baru',
      description: 'Deskripsi',
      sortOrder: 20,
      isActive: false,
    });
    expect(result).toBe(updated);
  });

  it('should propagate validation errors', async () => {
    await expect(useCase.execute('FINISHED_GOODS', {})).rejects.toThrow(
      'UPDATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockRepo.updateProductType).not.toHaveBeenCalled();
  });
});
