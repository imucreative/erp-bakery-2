import { ProductType } from './entities/ProductType';
import { UpdateProductTypeFields } from './entities/UpdateProductType';

export interface NewProductTypeData {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Abstract repository interface — ProductType reference data.
 *
 * Product types are global (not company-scoped). Products store the `code`;
 * the table is the source of truth for which codes are allowed.
 */
export abstract class ProductTypeRepository {
  /** List active product types ordered for product-form dropdowns. */
  abstract listActive(): Promise<ProductType[]>;

  /** List all product types (active + inactive) for the master-data page. */
  abstract listAll(): Promise<ProductType[]>;

  /** True when `code` exists and is active. */
  abstract isActive(code: string): Promise<boolean>;

  /** Get one row by code, including inactive rows. */
  abstract getByCode(code: string): Promise<ProductType>;

  abstract addProductType(data: NewProductTypeData): Promise<ProductType>;
  abstract updateProductType(
    code: string,
    fields: UpdateProductTypeFields,
  ): Promise<ProductType>;
  abstract deleteProductType(code: string): Promise<void>;
}
