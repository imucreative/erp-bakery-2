import { DeleteProductToppingUseCase } from '../DeleteProductToppingUseCase';
import { ProductToppingRepository } from '../../../../Domains/product-toppings/ProductToppingRepository';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { Product } from '../../../../Domains/products/entities/Product';

const mockToppingRepo = {
  listByProduct: jest.fn(),
  getById: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
} as unknown as jest.Mocked<ProductToppingRepository>;

const mockProductRepo = {
  getProductById: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const companyId = 'company-uuid';
const productId = 'prod-uuid';
const toppingId = 'topping-row-uuid';
const now = new Date();

const product = new Product({
  id: productId,
  companyId,
  sku: 'SKU-001',
  barcode: null,
  name: 'Es Kopi Susu',
  productGroupId: 'pg-uuid',
  categoryId: 'cat-uuid',
  uomId: 'base-uom-uuid',
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

describe('DeleteProductToppingUseCase', () => {
  let useCase: DeleteProductToppingUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteProductToppingUseCase(mockToppingRepo, mockProductRepo);
    mockProductRepo.getProductById.mockResolvedValue(product);
    mockToppingRepo.remove.mockResolvedValue(undefined);
  });

  it('should confirm the product then hard-delete the topping', async () => {
    await useCase.execute(productId, toppingId, companyId);

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(productId, companyId);
    expect(mockToppingRepo.remove).toHaveBeenCalledWith(toppingId, productId, companyId);
  });

  it('should propagate PRODUCT.NOT_FOUND when the product is missing', async () => {
    mockProductRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));
    await expect(useCase.execute(productId, toppingId, companyId)).rejects.toThrow(
      'PRODUCT.NOT_FOUND',
    );
    expect(mockToppingRepo.remove).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND from the repository', async () => {
    mockToppingRepo.remove.mockRejectedValue(new Error('PRODUCT_TOPPING.NOT_FOUND'));
    await expect(useCase.execute(productId, toppingId, companyId)).rejects.toThrow(
      'PRODUCT_TOPPING.NOT_FOUND',
    );
  });
});
