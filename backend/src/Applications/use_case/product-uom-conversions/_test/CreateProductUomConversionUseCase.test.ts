import { CreateProductUomConversionUseCase } from '../CreateProductUomConversionUseCase';
import { ProductUomConversionRepository } from '../../../../Domains/product-uom-conversions/ProductUomConversionRepository';
import { ProductUomConversion } from '../../../../Domains/product-uom-conversions/entities/ProductUomConversion';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { Product } from '../../../../Domains/products/entities/Product';
import { UomRepository } from '../../../../Domains/uoms/UomRepository';
import { Uom } from '../../../../Domains/uoms/entities/Uom';

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

const mockUomRepo = {
  getUomById: jest.fn(),
} as unknown as jest.Mocked<UomRepository>;

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
  uomId: 'base-uom-uuid', // base unit = gram
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

const altUom = new Uom({
  id: 'alt-uom-uuid', // karung
  companyId,
  code: 'UOM-050',
  name: 'Karung',
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const created = new ProductUomConversion({
  id: 'conv-uuid',
  companyId,
  productId,
  uomId: 'alt-uom-uuid',
  factorToBase: 25000,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  uomCode: 'UOM-050',
  uomName: 'Karung',
});

const validPayload = { uomId: 'alt-uom-uuid', factorToBase: 25000 };

describe('CreateProductUomConversionUseCase', () => {
  let useCase: CreateProductUomConversionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateProductUomConversionUseCase(
      mockConversionRepo,
      mockProductRepo,
      mockUomRepo,
    );
    mockProductRepo.getProductById.mockResolvedValue(product);
    mockUomRepo.getUomById.mockResolvedValue(altUom);
    mockConversionRepo.add.mockResolvedValue(created);
  });

  it('should validate references and persist a valid conversion', async () => {
    const result = await useCase.execute(productId, validPayload, companyId);

    expect(mockProductRepo.getProductById).toHaveBeenCalledWith(productId, companyId);
    expect(mockUomRepo.getUomById).toHaveBeenCalledWith('alt-uom-uuid', companyId);
    expect(mockConversionRepo.add).toHaveBeenCalledWith(
      { productId, uomId: 'alt-uom-uuid', factorToBase: 25000, isActive: true },
      companyId,
    );
    expect(result.factorToBase).toBe(25000);
  });

  it('should reject a non-positive factor (<= 0)', async () => {
    await expect(
      useCase.execute(productId, { uomId: 'alt-uom-uuid', factorToBase: 0 }, companyId),
    ).rejects.toThrow('CREATE_PRODUCT_UOM_CONVERSION.FACTOR_MUST_BE_POSITIVE');
    await expect(
      useCase.execute(productId, { uomId: 'alt-uom-uuid', factorToBase: -5 }, companyId),
    ).rejects.toThrow('CREATE_PRODUCT_UOM_CONVERSION.FACTOR_MUST_BE_POSITIVE');
    expect(mockConversionRepo.add).not.toHaveBeenCalled();
  });

  it('should reject when the alternate uom equals the product base unit', async () => {
    await expect(
      useCase.execute(productId, { uomId: 'base-uom-uuid', factorToBase: 1 }, companyId),
    ).rejects.toThrow('CREATE_PRODUCT_UOM_CONVERSION.UOM_IS_BASE_UNIT');
    expect(mockConversionRepo.add).not.toHaveBeenCalled();
  });

  it('should reject when the alternate uom is inactive', async () => {
    mockUomRepo.getUomById.mockResolvedValue({ ...altUom, isActive: false } as Uom);
    await expect(useCase.execute(productId, validPayload, companyId)).rejects.toThrow(
      'CREATE_PRODUCT_UOM_CONVERSION.UOM_INACTIVE',
    );
    expect(mockConversionRepo.add).not.toHaveBeenCalled();
  });

  it('should propagate a duplicate conflict from the repository', async () => {
    mockConversionRepo.add.mockRejectedValue(new Error('PRODUCT_UOM_CONVERSION.DUPLICATE'));
    await expect(useCase.execute(productId, validPayload, companyId)).rejects.toThrow(
      'PRODUCT_UOM_CONVERSION.DUPLICATE',
    );
  });

  it('should propagate PRODUCT.NOT_FOUND when the product is missing', async () => {
    mockProductRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));
    await expect(useCase.execute(productId, validPayload, companyId)).rejects.toThrow(
      'PRODUCT.NOT_FOUND',
    );
    expect(mockConversionRepo.add).not.toHaveBeenCalled();
  });

  it('should throw when payload is missing required fields', async () => {
    await expect(useCase.execute(productId, { factorToBase: 5 }, companyId)).rejects.toThrow(
      'CREATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
