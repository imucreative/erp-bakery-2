import {
  CategoryRepository,
  CategoryListFilter,
  CategoryListResult,
  NewCategoryData,
} from '../CategoryRepository';
import { ProductCategory } from '../entities/ProductCategory';
import { UpdateCategoryFields } from '../entities/UpdateCategory';

describe('CategoryRepository (abstract contract)', () => {
  class TestCategoryRepository extends CategoryRepository {
    async addCategory(_data: NewCategoryData, _companyId: string): Promise<ProductCategory> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async generateCategoryCode(_companyId: string): Promise<string> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getCategoriesByCompany(
      _companyId: string,
      _filter: CategoryListFilter,
    ): Promise<CategoryListResult> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getCategoryById(_id: string, _companyId: string): Promise<ProductCategory> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateCategory(
      _id: string,
      _companyId: string,
      _fields: UpdateCategoryFields,
    ): Promise<ProductCategory> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async softDeleteCategory(_id: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async countActiveDependents(_id: string, _companyId: string): Promise<number> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestCategoryRepository();

  it('addCategory should throw when not implemented', async () => {
    await expect(
      repo.addCategory(
        { code: 'PC-001', name: 'A', description: null, productGroupId: 'pg' },
        'c',
      ),
    ).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('generateCategoryCode should throw when not implemented', async () => {
    await expect(repo.generateCategoryCode('c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getCategoriesByCompany should throw when not implemented', async () => {
    await expect(repo.getCategoriesByCompany('c', { limit: 10, offset: 0 })).rejects.toThrow(
      'NOT_IMPLEMENTED',
    );
  });

  it('getCategoryById should throw when not implemented', async () => {
    await expect(repo.getCategoryById('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('updateCategory should throw when not implemented', async () => {
    await expect(repo.updateCategory('id', 'c', {})).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('softDeleteCategory should throw when not implemented', async () => {
    await expect(repo.softDeleteCategory('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('countActiveDependents should throw when not implemented', async () => {
    await expect(repo.countActiveDependents('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
