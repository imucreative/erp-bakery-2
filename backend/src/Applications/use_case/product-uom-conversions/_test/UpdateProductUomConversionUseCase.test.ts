import { UpdateProductUomConversionUseCase } from '../UpdateProductUomConversionUseCase';
import { ProductUomConversionRepository } from '../../../../Domains/product-uom-conversions/ProductUomConversionRepository';
import { ProductUomConversion } from '../../../../Domains/product-uom-conversions/entities/ProductUomConversion';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { Product } from '../../../../Domains/products/entities/Product';

const mockConversionRepo = {
  listByProduct: jest.fn(),
  getById: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
} as unknown as jest.Mocked<ProductUomConversionRepository>;

const mockProductRepo = {
  getProductById: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const companyId = 'company-uuid';
const productId = 'prod-uuid';
const conversionId = 'conv-uuid';
const now = new Date();

const product = new Product({
  id: productId,
  companyId,
  sku: 'SKU-001',
  barcode: null,
  name: 'Tepung Terigu',
  productGroupId: 'pg-uuid',
  categoryId: 'cat-uuid',
  uomId: 'base-uom-uuid',
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
});

const updated = new ProductUomConversion({
  id: conversionId,
  companyId,
  productId,
  uomId: 'alt-uom-uuid',
  factorToBase: 30000,
  isActive: false,
  createdAt: now,
  updatedAt: now,
  uomCode: 'UOM-050',
  uomName: 'Karung',
});

describe('UpdateProductUomConversionUseCase', () => {
  let useCase: UpdateProductUomConversionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateProductUomConversionUseCase(mockConversionRepo, mockProductRepo);
    mockProductRepo.getProductById.mockResolvedValue(product);
    mockConversionRepo.update.mockResolvedValue(updated);
  });

  it('should update factor and active flag', async () => {
    const result = await useCase.execute(
      productId,
      conversionId,
      { factorToBase: 30000, isActive: false },
      companyId,
    );

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(productId, companyId);
    expect(mockConversionRepo.update).toHaveBeenCalledWith(conversionId, productId, companyId, {
      factorToBase: 30000,
      isActive: false,
    });
    expect(result.factorToBase).toBe(30000);
    expect(result.isActive).toBe(false);
  });

  it('should reject a non-positive factor', async () => {
    await expect(
      useCase.execute(productId, conversionId, { factorToBase: 0 }, companyId),
    ).rejects.toThrow('UPDATE_PRODUCT_UOM_CONVERSION.FACTOR_MUST_BE_POSITIVE');
    expect(mockConversionRepo.update).not.toHaveBeenCalled();
  });

  it('should reject an empty update payload', async () => {
    await expect(useCase.execute(productId, conversionId, {}, companyId)).rejects.toThrow(
      'UPDATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockConversionRepo.update).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND from the repository', async () => {
    mockConversionRepo.update.mockRejectedValue(new Error('PRODUCT_UOM_CONVERSION.NOT_FOUND'));
    await expect(
      useCase.execute(productId, conversionId, { factorToBase: 5 }, companyId),
    ).rejects.toThrow('PRODUCT_UOM_CONVERSION.NOT_FOUND');
  });
});
