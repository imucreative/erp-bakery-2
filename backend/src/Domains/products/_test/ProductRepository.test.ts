import {
  ProductRepository,
  ProductListFilter,
  ProductListResult,
  NewProductData,
} from '../ProductRepository';
import { Product } from '../entities/Product';
import { UpdateProductFields } from '../entities/UpdateProduct';

const newData: NewProductData = {
  sku: 'SKU-001',
  barcode: null,
  name: 'Roti',
  productGroupId: 'pg',
  categoryId: 'cat',
  uomId: 'uom',
  supplierId: 'sup',
  productType: 'FINISHED_GOODS',
  purchasePrice: 0,
  sellingPrice: 0,
  minimumStock: 0,
  shelfLifeDays: 0,
  isBatchTracked: true,
};

describe('ProductRepository (abstract contract)', () => {
  class TestProductRepository extends ProductRepository {
    async addProduct(_data: NewProductData, _companyId: string): Promise<Product> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getProductsByCompany(
      _companyId: string,
      _filter: ProductListFilter,
    ): Promise<ProductListResult> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getProductById(_id: string, _companyId: string): Promise<Product> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateProduct(
      _id: string,
      _companyId: string,
      _fields: UpdateProductFields,
    ): Promise<Product> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async softDeleteProduct(_id: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async verifyAvailableSku(
      _sku: string,
      _companyId: string,
      _excludeId?: string,
    ): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async verifyAvailableBarcode(
      _barcode: string,
      _companyId: string,
      _excludeId?: string,
    ): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestProductRepository();

  it('addProduct should throw when not implemented', async () => {
    await expect(repo.addProduct(newData, 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getProductsByCompany should throw when not implemented', async () => {
    await expect(repo.getProductsByCompany('c', { limit: 10, offset: 0 })).rejects.toThrow(
      'NOT_IMPLEMENTED',
    );
  });

  it('getProductById should throw when not implemented', async () => {
    await expect(repo.getProductById('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('updateProduct should throw when not implemented', async () => {
    await expect(repo.updateProduct('id', 'c', {})).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('softDeleteProduct should throw when not implemented', async () => {
    await expect(repo.softDeleteProduct('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('verifyAvailableSku should throw when not implemented', async () => {
    await expect(repo.verifyAvailableSku('SKU', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('verifyAvailableBarcode should throw when not implemented', async () => {
    await expect(repo.verifyAvailableBarcode('899', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
