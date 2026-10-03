import { DeleteProductUomConversionUseCase } from '../DeleteProductUomConversionUseCase';
import { ProductUomConversionRepository } from '../../../../Domains/product-uom-conversions/ProductUomConversionRepository';
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

describe('DeleteProductUomConversionUseCase', () => {
  let useCase: DeleteProductUomConversionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteProductUomConversionUseCase(mockConversionRepo, mockProductRepo);
    mockProductRepo.getProductById.mockResolvedValue(product);
    mockConversionRepo.remove.mockResolvedValue(undefined);
  });

  it('should confirm the product then delete the conversion', async () => {
    await useCase.execute(productId, conversionId, companyId);

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(productId, companyId);
    expect(mockConversionRepo.remove).toHaveBeenCalledWith(conversionId, productId, companyId);
  });

  it('should propagate NOT_FOUND from the repository', async () => {
    mockConversionRepo.remove.mockRejectedValue(new Error('PRODUCT_UOM_CONVERSION.NOT_FOUND'));
    await expect(useCase.execute(productId, conversionId, companyId)).rejects.toThrow(
      'PRODUCT_UOM_CONVERSION.NOT_FOUND',
    );
  });

  it('should propagate PRODUCT.NOT_FOUND and not attempt delete', async () => {
    mockProductRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));
    await expect(useCase.execute(productId, conversionId, companyId)).rejects.toThrow(
      'PRODUCT.NOT_FOUND',
    );
    expect(mockConversionRepo.remove).not.toHaveBeenCalled();
  });
});
