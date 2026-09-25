import { ProductGroup } from './entities/ProductGroup';
import { UpdateProductGroupFields } from './entities/UpdateProductGroup';

export interface ProductGroupListFilter {
  limit: number;
  offset: number;
  search?: string;
  isActive?: boolean;
}

export interface ProductGroupListResult {
  rows: ProductGroup[];
  total: number;
}

export interface NewProductGroupData {
  code: string;
  name: string;
  description: string | null;
}

/**
 * Abstract repository interface — Product Groups domain.
 * Concrete implementation lives in Infrastructures/repository/.
 *
 * Every read/write is scoped by companyId (SaaS multi-tenant isolation).
 */
export abstract class ProductGroupRepository {
  /** Persist a new product group and return the created record. */
  abstract addProductGroup(
    data: NewProductGroupData,
    companyId: string,
  ): Promise<ProductGroup>;

  /** Generate a unique sequential code within a company (e.g. "PG-001"). */
  abstract generateProductGroupCode(companyId: string): Promise<string>;

  /** List product groups for a company with pagination + optional filters. */
  abstract getProductGroupsByCompany(
    companyId: string,
    filter: ProductGroupListFilter,
  ): Promise<ProductGroupListResult>;

  /** Fetch a single product group scoped to a company. Throws PRODUCT_GROUP.NOT_FOUND. */
  abstract getProductGroupById(id: string, companyId: string): Promise<ProductGroup>;

  /** Update a product group scoped to a company. Throws PRODUCT_GROUP.NOT_FOUND. */
  abstract updateProductGroup(
    id: string,
    companyId: string,
    fields: UpdateProductGroupFields,
  ): Promise<ProductGroup>;

  /** Soft-delete a product group scoped to a company. Throws PRODUCT_GROUP.NOT_FOUND. */
  abstract softDeleteProductGroup(id: string, companyId: string): Promise<void>;

  /**
   * Count active (non-deleted) records that depend on this product group:
   * product categories and products referencing it. Used to enforce
   * master-data dependency protection (block delete/deactivate when > 0).
   */
  abstract countActiveDependents(id: string, companyId: string): Promise<number>;
}
