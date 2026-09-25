import {
  ProductGroupRepository,
  ProductGroupListFilter,
  ProductGroupListResult,
  NewProductGroupData,
} from '../ProductGroupRepository';
import { ProductGroup } from '../entities/ProductGroup';
import { UpdateProductGroupFields } from '../entities/UpdateProductGroup';

describe('ProductGroupRepository (abstract contract)', () => {
  class TestProductGroupRepository extends ProductGroupRepository {
    async addProductGroup(_data: NewProductGroupData, _companyId: string): Promise<ProductGroup> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async generateProductGroupCode(_companyId: string): Promise<string> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getProductGroupsByCompany(
      _companyId: string,
      _filter: ProductGroupListFilter,
    ): Promise<ProductGroupListResult> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getProductGroupById(_id: string, _companyId: string): Promise<ProductGroup> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateProductGroup(
      _id: string,
      _companyId: string,
      _fields: UpdateProductGroupFields,
    ): Promise<ProductGroup> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async softDeleteProductGroup(_id: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async countActiveDependents(_id: string, _companyId: string): Promise<number> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestProductGroupRepository();

  it('addProductGroup should throw when not implemented', async () => {
    await expect(
      repo.addProductGroup({ code: 'PG-001', name: 'A', description: null }, 'c'),
    ).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('generateProductGroupCode should throw when not implemented', async () => {
    await expect(repo.generateProductGroupCode('c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getProductGroupsByCompany should throw when not implemented', async () => {
    await expect(
      repo.getProductGroupsByCompany('c', { limit: 10, offset: 0 }),
    ).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getProductGroupById should throw when not implemented', async () => {
    await expect(repo.getProductGroupById('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('updateProductGroup should throw when not implemented', async () => {
    await expect(repo.updateProductGroup('id', 'c', {})).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('softDeleteProductGroup should throw when not implemented', async () => {
    await expect(repo.softDeleteProductGroup('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('countActiveDependents should throw when not implemented', async () => {
    await expect(repo.countActiveDependents('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
