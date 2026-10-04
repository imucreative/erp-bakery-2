import { CreateProductToppingUseCase } from '../CreateProductToppingUseCase';
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
const toppingProductId = 'topping-uuid';
const now = new Date();

function buildProduct(overrides: Partial<ConstructorParameters<typeof Product>[0]> = {}): Product {
  return new Product({
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
    ...overrides,
  });
}

const sellableProduct = buildProduct();

const toppingProduct = buildProduct({
  id: toppingProductId,
  sku: 'TOP-001',
  name: 'Boba',
  productType: 'RAW_MATERIAL',
});

const created = new ProductTopping({
  id: 'topping-row-uuid',
  companyId,
  productId,
  toppingProductId,
  defaultQtyPerItem: 1,
  extraPrice: 2000,
  sortOrder: 0,
  isActive: true,
  createdAt: now,
  toppingName: 'Boba',
  toppingSku: 'TOP-001',
  uomId: 'base-uom-uuid',
  uomCode: 'GR',
});

const validPayload = { toppingProductId, defaultQtyPerItem: 1, extraPrice: 2000 };

describe('CreateProductToppingUseCase', () => {
  let useCase: CreateProductToppingUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateProductToppingUseCase(mockToppingRepo, mockProductRepo);
    mockProductRepo.getProductById.mockImplementation(async (id: string) => {
      if (id === productId) return sellableProduct;
      if (id === toppingProductId) return toppingProduct;
      throw new Error('PRODUCT.NOT_FOUND');
    });
    mockToppingRepo.add.mockResolvedValue(created);
  });

  it('should validate references and persist a valid topping (happy path)', async () => {
    const result = await useCase.execute(productId, validPayload, companyId);

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(productId, companyId);
    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(toppingProductId, companyId);
    expect(mockToppingRepo.add).toHaveBeenCalledWith(
      {
        productId,
        toppingProductId,
        defaultQtyPerItem: 1,
        extraPrice: 2000,
        sortOrder: 0,
        isActive: true,
      },
      companyId,
    );
    expect(result.toppingName).toBe('Boba');
  });

  it('should default extraPrice to 0 and sortOrder to 0 when omitted', async () => {
    await useCase.execute(productId, { toppingProductId, defaultQtyPerItem: 2 }, companyId);
    expect(mockToppingRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({ extraPrice: 0, sortOrder: 0, isActive: true }),
      companyId,
    );
  });

  it('should reject a topping product that is not RAW_MATERIAL / SEMI_FINISHED', async () => {
    mockProductRepo.getProductById.mockImplementation(async (id: string) => {
      if (id === productId) return sellableProduct;
      if (id === toppingProductId) return buildProduct({ id: toppingProductId, productType: 'FINISHED_GOODS' });
      throw new Error('PRODUCT.NOT_FOUND');
    });
    await expect(useCase.execute(productId, validPayload, companyId)).rejects.toThrow(
      'PRODUCT_TOPPING.INVALID_TOPPING_TYPE',
    );
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should accept a SEMI_FINISHED topping product', async () => {
    mockProductRepo.getProductById.mockImplementation(async (id: string) => {
      if (id === productId) return sellableProduct;
      if (id === toppingProductId) return buildProduct({ id: toppingProductId, productType: 'SEMI_FINISHED' });
      throw new Error('PRODUCT.NOT_FOUND');
    });
    await useCase.execute(productId, validPayload, companyId);
    expect(mockToppingRepo.add).toHaveBeenCalled();
  });

  it('should reject self-topping (topping == owning product)', async () => {
    await expect(
      useCase.execute(productId, { toppingProductId: productId, defaultQtyPerItem: 1 }, companyId),
    ).rejects.toThrow('PRODUCT_TOPPING.SELF_TOPPING');
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should reject a non-positive qty', async () => {
    await expect(
      useCase.execute(productId, { toppingProductId, defaultQtyPerItem: 0 }, companyId),
    ).rejects.toThrow('CREATE_PRODUCT_TOPPING.QTY_MUST_BE_POSITIVE');
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should reject a negative extra price', async () => {
    await expect(
      useCase.execute(productId, { toppingProductId, defaultQtyPerItem: 1, extraPrice: -1 }, companyId),
    ).rejects.toThrow('CREATE_PRODUCT_TOPPING.EXTRA_PRICE_MUST_BE_NON_NEGATIVE');
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should propagate a duplicate conflict from the repository', async () => {
    mockToppingRepo.add.mockRejectedValue(new Error('PRODUCT_TOPPING.DUPLICATE'));
    await expect(useCase.execute(productId, validPayload, companyId)).rejects.toThrow(
      'PRODUCT_TOPPING.DUPLICATE',
    );
  });

  it('should propagate PRODUCT.NOT_FOUND when the owning product is missing', async () => {
    mockProductRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));
    await expect(useCase.execute(productId, validPayload, companyId)).rejects.toThrow(
      'PRODUCT.NOT_FOUND',
    );
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should throw when payload is missing required fields', async () => {
    await expect(useCase.execute(productId, { defaultQtyPerItem: 1 }, companyId)).rejects.toThrow(
      'CREATE_PRODUCT_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
