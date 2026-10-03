import { ListProductUomConversionsUseCase } from '../ListProductUomConversionsUseCase';
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

const rows = [
  new ProductUomConversion({
    id: 'conv-1',
    companyId,
    productId,
    uomId: 'alt-uom-uuid',
    factorToBase: 25000,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    uomCode: 'UOM-050',
    uomName: 'Karung',
  }),
];

describe('ListProductUomConversionsUseCase', () => {
  let useCase: ListProductUomConversionsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListProductUomConversionsUseCase(mockConversionRepo, mockProductRepo);
    mockProductRepo.getProductById.mockResolvedValue(product);
    mockConversionRepo.listByProduct.mockResolvedValue(rows);
  });

  it('should confirm the product then list its conversions', async () => {
    const result = await useCase.execute(productId, companyId);

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(productId, companyId);
    expect(mockConversionRepo.listByProduct).toHaveBeenCalledWith(productId, companyId);
    expect(result).toHaveLength(1);
    expect(result[0].uomName).toBe('Karung');
  });

  it('should propagate PRODUCT.NOT_FOUND when the product is missing', async () => {
    mockProductRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));
    await expect(useCase.execute(productId, companyId)).rejects.toThrow('PRODUCT.NOT_FOUND');
    expect(mockConversionRepo.listByProduct).not.toHaveBeenCalled();
  });
});
