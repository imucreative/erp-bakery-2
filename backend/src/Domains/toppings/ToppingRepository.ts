import { Topping } from './entities/Topping';
import { UpdateToppingFields } from './entities/UpdateTopping';

export interface NewToppingData {
  toppingProductId: string;
  defaultQtyPerItem: number;
  extraPrice: number;
  sortOrder: number;
  isActive: boolean;
  createdBy: string | null;
}

/**
 * Abstract repository interface — GLOBAL Topping catalog domain (doc 51 §5.0).
 *
 * Pure data access (query/insert/update/delete). No business logic lives here;
 * referential validation (topping type) and duplicate rules are enforced in the
 * use cases / translated from the UNIQUE violation. Every read/write is scoped
 * by companyId (SaaS multi-tenant isolation).
 */
export abstract class ToppingRepository {
  /** List the whole catalog within the company in alphabetical name order — for management. */
  abstract list(companyId: string): Promise<Topping[]>;

  /** List only ACTIVE catalog entries within the company — for the POS modifier panel. */
  abstract listActive(companyId: string): Promise<Topping[]>;

  /** Fetch a single catalog entry by id within the company, or throw NOT_FOUND. */
  abstract getById(id: string, companyId: string): Promise<Topping>;

  /** Insert a new catalog entry; translates the UNIQUE violation to DUPLICATE. */
  abstract add(data: NewToppingData, companyId: string): Promise<Topping>;

  /** Update qty / extra price / sort order / active flag for an existing entry. */
  abstract update(
    id: string,
    companyId: string,
    fields: UpdateToppingFields,
    updatedBy: string | null,
  ): Promise<Topping>;

  /** Hard-delete a catalog entry within the company, or throw NOT_FOUND. */
  abstract remove(id: string, companyId: string): Promise<void>;
}
