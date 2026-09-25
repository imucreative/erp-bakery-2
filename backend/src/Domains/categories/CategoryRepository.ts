import { ProductCategory } from './entities/ProductCategory';
import { UpdateCategoryFields } from './entities/UpdateCategory';

export interface CategoryListFilter {
  limit: number;
  offset: number;
  search?: string;
  isActive?: boolean;
  productGroupId?: string;
}

export interface CategoryListResult {
  rows: ProductCategory[];
  total: number;
}

export interface NewCategoryData {
  code: string;
  name: string;
  description: string | null;
  productGroupId: string;
}

/**
 * Abstract repository interface — Product Category domain.
 * Every read/write is scoped by companyId (SaaS multi-tenant isolation).
 */
export abstract class CategoryRepository {
  abstract addCategory(data: NewCategoryData, companyId: string): Promise<ProductCategory>;
  abstract generateCategoryCode(companyId: string): Promise<string>;
  abstract getCategoriesByCompany(
    companyId: string,
    filter: CategoryListFilter,
  ): Promise<CategoryListResult>;
  abstract getCategoryById(id: string, companyId: string): Promise<ProductCategory>;
  abstract updateCategory(
    id: string,
    companyId: string,
    fields: UpdateCategoryFields,
  ): Promise<ProductCategory>;
  abstract softDeleteCategory(id: string, companyId: string): Promise<void>;

  /**
   * Count active (non-deleted) products referencing this category. Used to
   * enforce master-data dependency protection (block delete/deactivate when > 0).
   */
  abstract countActiveDependents(id: string, companyId: string): Promise<number>;
}
