import { CreateProductUseCase } from '../CreateProductUseCase';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { Product } from '../../../../Domains/products/entities/Product';
import { ProductGroupRepository } from '../../../../Domains/product-groups/ProductGroupRepository';
import { ProductGroup } from '../../../../Domains/product-groups/entities/ProductGroup';
import { CategoryRepository } from '../../../../Domains/categories/CategoryRepository';
import { ProductCategory } from '../../../../Domains/categories/entities/ProductCategory';
import { UomRepository } from '../../../../Domains/uoms/UomRepository';
import { Uom } from '../../../../Domains/uoms/entities/Uom';
import { SupplierRepository } from '../../../../Domains/suppliers/SupplierRepository';
import { Supplier } from '../../../../Domains/suppliers/entities/Supplier';

const mockProductRepo = {
  addProduct: jest.fn(),
  getProductsByCompany: jest.fn(),
  getProductById: jest.fn(),
  updateProduct: jest.fn(),
  softDeleteProduct: jest.fn(),
  verifyAvailableSku: jest.fn(),
  verifyAvailableBarcode: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const mockGroupRepo = {
  getProductGroupById: jest.fn(),
} as unknown as jest.Mocked<ProductGroupRepository>;

const mockCategoryRepo = {
  getCategoryById: jest.fn(),
} as unknown as jest.Mocked<CategoryRepository>;

const mockUomRepo = {
  getUomById: jest.fn(),
} as unknown as jest.Mocked<UomRepository>;

const mockSupplierRepo = {
  getSupplierById: jest.fn(),
} as unknown as jest.Mocked<SupplierRepository>;

const companyId = 'company-uuid';
const now = new Date();

const group = new ProductGroup({
  id: 'pg-uuid',
  companyId,
  code: 'PG-001',
  name: 'Bakery',
  description: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const category = new ProductCategory({
  id: 'cat-uuid',
  companyId,
  productGroupId: 'pg-uuid',
  code: 'PC-001',
  name: 'Roti',
  description: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const uom = new Uom({
  id: 'uom-uuid',
  companyId,
  code: 'UOM-001',
  name: 'Pcs',
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const supplier = new Supplier({
  id: 'sup-uuid',
  companyId,
  code: 'SUP-001',
  name: 'PT Tepung',
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const created = new Product({
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

const validPayload = {
  sku: 'SKU-001',
  name: 'Roti Tawar',
  productGroupId: 'pg-uuid',
  categoryId: 'cat-uuid',
  uomId: 'uom-uuid',
  supplierId: 'sup-uuid',
  productType: 'FINISHED_GOODS',
};

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateProductUseCase(
      mockProductRepo,
      mockGroupRepo,
      mockCategoryRepo,
      mockUomRepo,
      mockSupplierRepo,
    );
    mockGroupRepo.getProductGroupById.mockResolvedValue(group);
    mockCategoryRepo.getCategoryById.mockResolvedValue(category);
    mockUomRepo.getUomById.mockResolvedValue(uom);
    mockSupplierRepo.getSupplierById.mockResolvedValue(supplier);
    mockProductRepo.verifyAvailableSku.mockResolvedValue(undefined);
    mockProductRepo.verifyAvailableBarcode.mockResolvedValue(undefined);
    mockProductRepo.addProduct.mockResolvedValue(created);
  });

  it('should validate all references and persist the product', async () => {
    const result = await useCase.execute(validPayload, companyId);

    expect(mockGroupRepo.getProductGroupById).toHaveBeenCalledWith('pg-uuid', companyId);
    expect(mockCategoryRepo.getCategoryById).toHaveBeenCalledWith('cat-uuid', companyId);
    expect(mockUomRepo.getUomById).toHaveBeenCalledWith('uom-uuid', companyId);
    expect(mockSupplierRepo.getSupplierById).toHaveBeenCalledWith('sup-uuid', companyId);
    expect(mockProductRepo.verifyAvailableSku).toHaveBeenCalledWith('SKU-001', companyId);
    expect(mockProductRepo.addProduct).toHaveBeenCalled();
    expect(result.sku).toBe('SKU-001');
  });

  it('should check barcode uniqueness when a barcode is provided', async () => {
    await useCase.execute({ ...validPayload, barcode: '899' }, companyId);
    expect(mockProductRepo.verifyAvailableBarcode).toHaveBeenCalledWith('899', companyId);
  });

  it('should not check barcode uniqueness when no barcode is provided', async () => {
    await useCase.execute(validPayload, companyId);
    expect(mockProductRepo.verifyAvailableBarcode).not.toHaveBeenCalled();
  });

  it('should throw when the product group is inactive', async () => {
    mockGroupRepo.getProductGroupById.mockResolvedValue({ ...group, isActive: false } as ProductGroup);
    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow(
      'CREATE_PRODUCT.PRODUCT_GROUP_INACTIVE',
    );
    expect(mockProductRepo.addProduct).not.toHaveBeenCalled();
  });

  it('should throw when the category is inactive', async () => {
    mockCategoryRepo.getCategoryById.mockResolvedValue({ ...category, isActive: false } as ProductCategory);
    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow(
      'CREATE_PRODUCT.CATEGORY_INACTIVE',
    );
  });

  it('should throw when the category does not belong to the product group', async () => {
    mockCategoryRepo.getCategoryById.mockResolvedValue({
      ...category,
      productGroupId: 'other-pg',
    } as ProductCategory);
    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow(
      'CREATE_PRODUCT.CATEGORY_GROUP_MISMATCH',
    );
  });

  it('should throw when the uom is inactive', async () => {
    mockUomRepo.getUomById.mockResolvedValue({ ...uom, isActive: false } as Uom);
    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow(
      'CREATE_PRODUCT.UOM_INACTIVE',
    );
  });

  it('should throw when the supplier is inactive', async () => {
    mockSupplierRepo.getSupplierById.mockResolvedValue({ ...supplier, isActive: false } as Supplier);
    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow(
      'CREATE_PRODUCT.SUPPLIER_INACTIVE',
    );
  });

  it('should propagate SKU conflict', async () => {
    mockProductRepo.verifyAvailableSku.mockRejectedValue(new Error('PRODUCT.SKU_ALREADY_USED'));
    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow(
      'PRODUCT.SKU_ALREADY_USED',
    );
    expect(mockProductRepo.addProduct).not.toHaveBeenCalled();
  });

  it('should throw when payload is invalid', async () => {
    await expect(useCase.execute({ ...validPayload, sku: '' }, companyId)).rejects.toThrow(
      'CREATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
