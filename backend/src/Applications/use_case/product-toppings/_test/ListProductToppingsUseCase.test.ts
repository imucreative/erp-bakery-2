import { ListProductToppingsUseCase } from '../ListProductToppingsUseCase';
import { ProductToppingRepository } from '../../../../Domains/product-toppings/ProductToppingRepository';
import { ProductTopping } from '../../../../Domains/product-toppings/entities/ProductTopping';
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

const rows = [
  new ProductTopping({
    id: 'topping-1',
    companyId,
    productId,
    toppingProductId: 'topping-uuid',
    defaultQtyPerItem: 1,
    extraPrice: 2000,
    sortOrder: 0,
    isActive: true,
    createdAt: now,
    toppingName: 'Boba',
    toppingSku: 'TOP-001',
    uomId: 'base-uom-uuid',
    uomCode: 'GR',
  }),
];

describe('ListProductToppingsUseCase', () => {
  let useCase: ListProductToppingsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListProductToppingsUseCase(mockToppingRepo, mockProductRepo);
    mockProductRepo.getProductById.mockResolvedValue(product);
    mockToppingRepo.listByProduct.mockResolvedValue(rows);
  });

  it('should confirm the product then list its toppings', async () => {
    const result = await useCase.execute(productId, companyId);

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(productId, companyId);
    expect(mockToppingRepo.listByProduct).toHaveBeenCalledWith(productId, companyId);
    expect(result).toHaveLength(1);
    expect(result[0].toppingName).toBe('Boba');
    expect(result[0].uomCode).toBe('GR');
  });

  it('should propagate PRODUCT.NOT_FOUND when the product is missing', async () => {
    mockProductRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));
    await expect(useCase.execute(productId, companyId)).rejects.toThrow('PRODUCT.NOT_FOUND');
    expect(mockToppingRepo.listByProduct).not.toHaveBeenCalled();
  });
});
