import { CreateProductTypeUseCase } from '../CreateProductTypeUseCase';
import { ProductTypeRepository } from '../../../../Domains/product-types/ProductTypeRepository';
import { ProductType } from '../../../../Domains/product-types/entities/ProductType';

const mockRepo = {
  addProductType: jest.fn(),
} as unknown as jest.Mocked<ProductTypeRepository>;

const created = new ProductType({
  code: 'FINISHED_GOODS',
  name: 'Barang Jadi',
  description: null,
  sortOrder: 0,
  isActive: true,
});

describe('CreateProductTypeUseCase', () => {
  let useCase: CreateProductTypeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateProductTypeUseCase(mockRepo);
    mockRepo.addProductType.mockResolvedValue(created);
  });

  it('should normalise input and persist the product type', async () => {
    const result = await useCase.execute({ code: 'finished_goods', name: ' Barang Jadi ' });

    expect(mockRepo.addProductType).toHaveBeenCalledWith({
      code: 'FINISHED_GOODS',
      name: 'Barang Jadi',
      description: null,
      sortOrder: 0,
      isActive: true,
    });
    expect(result).toBe(created);
  });

  it('should propagate validation errors', async () => {
    await expect(useCase.execute({ code: 'BAD-CODE', name: 'X' })).rejects.toThrow(
      'CREATE_PRODUCT_TYPE.CODE_INVALID',
    );
    expect(mockRepo.addProductType).not.toHaveBeenCalled();
  });

  it('should propagate duplicate-code conflicts', async () => {
    mockRepo.addProductType.mockRejectedValue(new Error('PRODUCT_TYPE.CODE_ALREADY_USED'));
    await expect(
      useCase.execute({ code: 'FINISHED_GOODS', name: 'Barang Jadi' }),
    ).rejects.toThrow('PRODUCT_TYPE.CODE_ALREADY_USED');
  });
});
