import { DeleteProductUseCase } from '../DeleteProductUseCase';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { Product } from '../../../../Domains/products/entities/Product';

const mockRepo = {
  addProduct: jest.fn(),
  getProductsByCompany: jest.fn(),
  getProductById: jest.fn(),
  updateProduct: jest.fn(),
  softDeleteProduct: jest.fn(),
  verifyAvailableSku: jest.fn(),
  verifyAvailableBarcode: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const companyId = 'company-uuid';
const now = new Date();

const existing = new Product({
  id: 'prod-uuid',
  companyId,
  sku: 'SKU-001',
  barcode: null,
  name: 'Roti Tawar',
  productGroupId: 'pg-uuid',
  categoryId: 'cat-uuid',
  uomId: 'uom-uuid',
  supplierId: 'sup-uuid',
  productType: 'FINISHED_GOODS',
  purchasePrice: 0,
  sellingPrice: 0,
  minimumStock: 0,
  shelfLifeDays: 0,
  isBatchTracked: true,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

describe('DeleteProductUseCase', () => {
  let useCase: DeleteProductUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteProductUseCase(mockRepo);
    mockRepo.getProductById.mockResolvedValue(existing);
  });

  it('should soft-delete an existing product', async () => {
    await useCase.execute('prod-uuid', companyId);
    expect(mockRepo.getProductById).toHaveBeenCalledWith('prod-uuid', companyId);
    expect(mockRepo.softDeleteProduct).toHaveBeenCalledWith('prod-uuid', companyId);
  });

  it('should propagate NOT_FOUND when the product does not exist', async () => {
    mockRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));
    await expect(useCase.execute('missing', companyId)).rejects.toThrow('PRODUCT.NOT_FOUND');
    expect(mockRepo.softDeleteProduct).not.toHaveBeenCalled();
  });
});
