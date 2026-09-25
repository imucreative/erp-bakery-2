import { UpdateProductUseCase } from '../UpdateProductUseCase';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { Product } from '../../../../Domains/products/entities/Product';

const mockRepo = {
  addProduct: jest.fn(),
  getProductsByCompany: jest.fn(),
  getProductById: jest.fn(),
  updateProduct: jest.fn(),
  softDeleteProduct: jest.fn(),
  verifyAvailableSku: jest.fn(),
  verifyAvailableBarcode: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const companyId = 'company-uuid';
const now = new Date();

const updated = new Product({
  id: 'prod-uuid',
  companyId,
  sku: 'SKU-001',
  barcode: null,
  name: 'Roti Baru',
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

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateProductUseCase(mockRepo);
    mockRepo.updateProduct.mockResolvedValue(updated);
    mockRepo.verifyAvailableBarcode.mockResolvedValue(undefined);
  });

  it('should apply the update when fields are valid', async () => {
    const result = await useCase.execute('prod-uuid', { name: 'Roti Baru' }, companyId);
    expect(mockRepo.updateProduct).toHaveBeenCalledWith('prod-uuid', companyId, {
      name: 'Roti Baru',
    });
    expect(result.name).toBe('Roti Baru');
  });

  it('should re-check barcode uniqueness (excluding self) when barcode is provided', async () => {
    await useCase.execute('prod-uuid', { barcode: '899' }, companyId);
    expect(mockRepo.verifyAvailableBarcode).toHaveBeenCalledWith('899', companyId, 'prod-uuid');
  });

  it('should not check barcode uniqueness when barcode is nulled', async () => {
    await useCase.execute('prod-uuid', { barcode: null }, companyId);
    expect(mockRepo.verifyAvailableBarcode).not.toHaveBeenCalled();
    expect(mockRepo.updateProduct).toHaveBeenCalled();
  });

  it('should propagate barcode conflict', async () => {
    mockRepo.verifyAvailableBarcode.mockRejectedValue(
      new Error('PRODUCT.BARCODE_ALREADY_USED'),
    );
    await expect(useCase.execute('prod-uuid', { barcode: '899' }, companyId)).rejects.toThrow(
      'PRODUCT.BARCODE_ALREADY_USED',
    );
    expect(mockRepo.updateProduct).not.toHaveBeenCalled();
  });

  it('should throw when payload has no updatable field', async () => {
    await expect(useCase.execute('prod-uuid', {}, companyId)).rejects.toThrow(
      'UPDATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
