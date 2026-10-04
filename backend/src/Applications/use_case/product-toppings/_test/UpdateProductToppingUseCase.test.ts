import { UpdateProductToppingUseCase } from '../UpdateProductToppingUseCase';
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

const updated = new ProductTopping({
  id: toppingId,
  companyId,
  productId,
  toppingProductId: 'topping-uuid',
  defaultQtyPerItem: 2,
  extraPrice: 3000,
  sortOrder: 1,
  isActive: false,
  createdAt: now,
  toppingName: 'Boba',
  toppingSku: 'TOP-001',
  uomId: 'base-uom-uuid',
  uomCode: 'GR',
});

describe('UpdateProductToppingUseCase', () => {
  let useCase: UpdateProductToppingUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateProductToppingUseCase(mockToppingRepo, mockProductRepo);
    mockProductRepo.getProductById.mockResolvedValue(product);
    mockToppingRepo.update.mockResolvedValue(updated);
  });

  it('should update qty / extra price / sort order / active flag', async () => {
    const result = await useCase.execute(
      productId,
      toppingId,
      { defaultQtyPerItem: 2, extraPrice: 3000, sortOrder: 1, isActive: false },
      companyId,
    );

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(productId, companyId);
    expect(mockToppingRepo.update).toHaveBeenCalledWith(toppingId, productId, companyId, {
      defaultQtyPerItem: 2,
      extraPrice: 3000,
      sortOrder: 1,
      isActive: false,
    });
    expect(result.defaultQtyPerItem).toBe(2);
    expect(result.isActive).toBe(false);
  });

  it('should reject a non-positive qty', async () => {
    await expect(
      useCase.execute(productId, toppingId, { defaultQtyPerItem: 0 }, companyId),
    ).rejects.toThrow('UPDATE_PRODUCT_TOPPING.QTY_MUST_BE_POSITIVE');
    expect(mockToppingRepo.update).not.toHaveBeenCalled();
  });

  it('should reject a negative extra price', async () => {
    await expect(
      useCase.execute(productId, toppingId, { extraPrice: -5 }, companyId),
    ).rejects.toThrow('UPDATE_PRODUCT_TOPPING.EXTRA_PRICE_MUST_BE_NON_NEGATIVE');
    expect(mockToppingRepo.update).not.toHaveBeenCalled();
  });

  it('should reject an empty update payload', async () => {
    await expect(useCase.execute(productId, toppingId, {}, companyId)).rejects.toThrow(
      'UPDATE_PRODUCT_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockToppingRepo.update).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND from the repository', async () => {
    mockToppingRepo.update.mockRejectedValue(new Error('PRODUCT_TOPPING.NOT_FOUND'));
    await expect(
      useCase.execute(productId, toppingId, { defaultQtyPerItem: 2 }, companyId),
    ).rejects.toThrow('PRODUCT_TOPPING.NOT_FOUND');
  });
});
