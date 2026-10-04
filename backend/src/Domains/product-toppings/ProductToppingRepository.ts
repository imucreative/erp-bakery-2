import { ProductTopping } from './entities/ProductTopping';
import { UpdateProductToppingFields } from './entities/UpdateProductTopping';

export interface NewProductToppingData {
  productId: string;
  toppingProductId: string;
  defaultQtyPerItem: number;
  extraPrice: number;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Abstract repository interface — ProductTopping domain.
 *
 * Pure data access (query/insert/update/delete). No business logic lives here;
 * referential validation (topping type, self-topping) and duplicate rules are
 * enforced in the use cases. Every read/write is scoped by companyId (SaaS
 * multi-tenant isolation).
 */
export abstract class ProductToppingRepository {
  /** List all toppings for a sellable product within the company (ordered by sort_order, name). */
  abstract listByProduct(productId: string, companyId: string): Promise<ProductTopping[]>;

  /** Fetch a single topping by id within product + company, or throw NOT_FOUND. */
  abstract getById(id: string, productId: string, companyId: string): Promise<ProductTopping>;

  /** Insert a new topping row; translates the UNIQUE violation to DUPLICATE. */
  abstract add(data: NewProductToppingData, companyId: string): Promise<ProductTopping>;

  /** Update qty / extra price / sort order / active flag for an existing topping. */
  abstract update(
    id: string,
    productId: string,
    companyId: string,
    fields: UpdateProductToppingFields,
  ): Promise<ProductTopping>;

  /** Hard-delete a topping row within product + company, or throw NOT_FOUND. */
  abstract remove(id: string, productId: string, companyId: string): Promise<void>;
}
