import { ProductUomConversion } from './entities/ProductUomConversion';
import { UpdateProductUomConversionFields } from './entities/UpdateProductUomConversion';

export interface NewProductUomConversionData {
  productId: string;
  uomId: string;
  factorToBase: number;
  isActive: boolean;
}

/**
 * Abstract repository interface — ProductUomConversion domain.
 *
 * Pure data access (query/insert/update/delete). No business logic lives here;
 * referential validation and duplicate rules are enforced in the use cases.
 * Every read/write is scoped by companyId (SaaS multi-tenant isolation).
 */
export abstract class ProductUomConversionRepository {
  /** List all conversions for a product within the company (ordered by created_at). */
  abstract listByProduct(
    productId: string,
    companyId: string,
  ): Promise<ProductUomConversion[]>;

  /** Fetch a single conversion by id within product + company, or throw NOT_FOUND. */
  abstract getById(
    id: string,
    productId: string,
    companyId: string,
  ): Promise<ProductUomConversion>;

  /** Insert a new conversion row; translates the UNIQUE violation to DUPLICATE. */
  abstract add(
    data: NewProductUomConversionData,
    companyId: string,
  ): Promise<ProductUomConversion>;

  /** Update factor_to_base / is_active for an existing conversion. */
  abstract update(
    id: string,
    productId: string,
    companyId: string,
    fields: UpdateProductUomConversionFields,
  ): Promise<ProductUomConversion>;

  /** Hard-delete a conversion row within product + company, or throw NOT_FOUND. */
  abstract remove(id: string, productId: string, companyId: string): Promise<void>;
}
