import { CreateToppingUseCase } from '../CreateToppingUseCase';
import { ToppingRepository } from '../../../../Domains/toppings/ToppingRepository';
import { Topping } from '../../../../Domains/toppings/entities/Topping';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { Product } from '../../../../Domains/products/entities/Product';

const mockToppingRepo = {
  list: jest.fn(),
  listActive: jest.fn(),
  getById: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
} as unknown as jest.Mocked<ToppingRepository>;

const mockProductRepo = {
  getProductById: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const companyId = 'company-uuid';
const toppingProductId = 'topping-uuid';
const userId = 'user-uuid';
const now = new Date();

function buildProduct(overrides: Partial<ConstructorParameters<typeof Product>[0]> = {}): Product {
  return new Product({
    id: toppingProductId,
    companyId,
    sku: 'TOP-001',
    barcode: null,
    name: 'Selai',
    productGroupId: 'pg-uuid',
    categoryId: 'cat-uuid',
    uomId: 'uom-uuid',
    supplierId: 'sup-uuid',
    productType: 'RAW_MATERIAL',
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

const toppingProduct = buildProduct();

const created = new Topping({
  id: 'topping-row-uuid',
  companyId,
  toppingProductId,
  defaultQtyPerItem: 25,
  extraPrice: 2000,
  sortOrder: 0,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  toppingName: 'Selai',
  toppingSku: 'TOP-001',
  uomId: 'uom-uuid',
  uomCode: 'GR',
});

const validPayload = { toppingProductId, defaultQtyPerItem: 25, extraPrice: 2000 };

describe('CreateToppingUseCase', () => {
  let useCase: CreateToppingUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateToppingUseCase(mockToppingRepo, mockProductRepo);
    mockProductRepo.getProductById.mockResolvedValue(toppingProduct);
    mockToppingRepo.add.mockResolvedValue(created);
  });

  it('should validate the topping product and persist a valid entry (happy path)', async () => {
    const result = await useCase.execute(validPayload, companyId, userId);

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(toppingProductId, companyId);
    expect(mockToppingRepo.add).toHaveBeenCalledWith(
      {
        toppingProductId,
        defaultQtyPerItem: 25,
        extraPrice: 2000,
        sortOrder: 0,
        isActive: true,
        createdBy: userId,
      },
      companyId,
    );
    expect(result.toppingName).toBe('Selai');
  });

  it('should default extraPrice to 0 and sortOrder to 0 when omitted', async () => {
    await useCase.execute({ toppingProductId, defaultQtyPerItem: 20 }, companyId, userId);
    expect(mockToppingRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({ extraPrice: 0, sortOrder: 0, isActive: true }),
      companyId,
    );
  });

  it('should accept a SEMI_FINISHED topping product', async () => {
    mockProductRepo.getProductById.mockResolvedValue(
      buildProduct({ productType: 'SEMI_FINISHED' }),
    );
    await useCase.execute(validPayload, companyId, userId);
    expect(mockToppingRepo.add).toHaveBeenCalled();
  });

  it('should reject a topping product that is not RAW_MATERIAL / SEMI_FINISHED', async () => {
    mockProductRepo.getProductById.mockResolvedValue(
      buildProduct({ productType: 'FINISHED_GOODS' }),
    );
    await expect(useCase.execute(validPayload, companyId, userId)).rejects.toThrow(
      'TOPPING.INVALID_PRODUCT_TYPE',
    );
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should reject a non-positive qty', async () => {
    await expect(
      useCase.execute({ toppingProductId, defaultQtyPerItem: 0 }, companyId, userId),
    ).rejects.toThrow('CREATE_TOPPING.QTY_MUST_BE_POSITIVE');
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should reject a negative extra price', async () => {
    await expect(
      useCase.execute({ toppingProductId, defaultQtyPerItem: 25, extraPrice: -1 }, companyId, userId),
    ).rejects.toThrow('CREATE_TOPPING.EXTRA_PRICE_MUST_BE_NON_NEGATIVE');
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should propagate a duplicate conflict from the repository', async () => {
    mockToppingRepo.add.mockRejectedValue(new Error('TOPPING.DUPLICATE'));
    await expect(useCase.execute(validPayload, companyId, userId)).rejects.toThrow(
      'TOPPING.DUPLICATE',
    );
  });

  it('should propagate PRODUCT.NOT_FOUND when the topping product is missing', async () => {
    mockProductRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));
    await expect(useCase.execute(validPayload, companyId, userId)).rejects.toThrow(
      'PRODUCT.NOT_FOUND',
    );
    expect(mockToppingRepo.add).not.toHaveBeenCalled();
  });

  it('should throw when payload is missing required fields', async () => {
    await expect(useCase.execute({ defaultQtyPerItem: 1 }, companyId, userId)).rejects.toThrow(
      'CREATE_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
