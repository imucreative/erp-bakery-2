import { Product } from './entities/Product';
import { UpdateProductFields } from './entities/UpdateProduct';

export interface ProductListFilter {
  limit: number;
  offset: number;
  search?: string;
  isActive?: boolean;
  productType?: string;
  productGroupId?: string;
  categoryId?: string;
  supplierId?: string;
}

export interface ProductListResult {
  rows: Product[];
  total: number;
}

export interface NewProductData {
  sku: string;
  barcode: string | null;
  name: string;
  productGroupId: string;
  categoryId: string;
  uomId: string;
  supplierId: string;
  productType: string;
  purchasePrice: number;
  sellingPrice: number;
  minimumStock: number;
  shelfLifeDays: number;
  isBatchTracked: boolean;
  hasToppings: boolean;
}

/**
 * Abstract repository interface — Product domain.
 * Every read/write is scoped by companyId (SaaS multi-tenant isolation).
 */
export abstract class ProductRepository {
  abstract addProduct(data: NewProductData, companyId: string): Promise<Product>;
  abstract getProductsByCompany(
    companyId: string,
    filter: ProductListFilter,
  ): Promise<ProductListResult>;
  abstract getProductById(id: string, companyId: string): Promise<Product>;
  abstract updateProduct(
    id: string,
    companyId: string,
    fields: UpdateProductFields,
  ): Promise<Product>;
  abstract softDeleteProduct(id: string, companyId: string): Promise<void>;

  /**
   * Throw PRODUCT.SKU_ALREADY_USED when the SKU is taken within the company.
   * `excludeId` allows re-checking during an update without matching the record itself.
   */
  abstract verifyAvailableSku(sku: string, companyId: string, excludeId?: string): Promise<void>;

  /**
   * Throw PRODUCT.BARCODE_ALREADY_USED when a non-null barcode is taken within the
   * company. `excludeId` allows re-checking during an update.
   */
  abstract verifyAvailableBarcode(
    barcode: string,
    companyId: string,
    excludeId?: string,
  ): Promise<void>;
}
