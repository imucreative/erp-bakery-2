import {
  ProductUomConversionRepository,
  NewProductUomConversionData,
} from '../ProductUomConversionRepository';
import { ProductUomConversion } from '../entities/ProductUomConversion';
import { UpdateProductUomConversionFields } from '../entities/UpdateProductUomConversion';

const newData: NewProductUomConversionData = {
  productId: 'prod-uuid',
  uomId: 'alt-uom-uuid',
  factorToBase: 25000,
  isActive: true,
};

describe('ProductUomConversionRepository (abstract contract)', () => {
  class TestRepo extends ProductUomConversionRepository {
    async listByProduct(_productId: string, _companyId: string): Promise<ProductUomConversion[]> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getById(
      _id: string,
      _productId: string,
      _companyId: string,
    ): Promise<ProductUomConversion> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async add(
      _data: NewProductUomConversionData,
      _companyId: string,
    ): Promise<ProductUomConversion> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async update(
      _id: string,
      _productId: string,
      _companyId: string,
      _fields: UpdateProductUomConversionFields,
    ): Promise<ProductUomConversion> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async remove(_id: string, _productId: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestRepo();

  it('listByProduct should throw when not implemented', async () => {
    await expect(repo.listByProduct('p', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getById should throw when not implemented', async () => {
    await expect(repo.getById('id', 'p', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('add should throw when not implemented', async () => {
    await expect(repo.add(newData, 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('update should throw when not implemented', async () => {
    await expect(repo.update('id', 'p', 'c', {})).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('remove should throw when not implemented', async () => {
    await expect(repo.remove('id', 'p', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
