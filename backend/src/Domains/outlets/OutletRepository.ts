import { Outlet } from './entities/Outlet';
import { UpdateOutletFields } from './entities/UpdateOutlet';

export interface OutletListFilter {
  limit: number;
  offset: number;
  search?: string;
  isActive?: boolean;
}

export interface OutletListResult {
  rows: Outlet[];
  total: number;
}

export interface NewOutletData {
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
}

/**
 * Abstract repository interface — Outlets domain.
 * Concrete implementation lives in Infrastructures/repository/.
 *
 * Every read/write is scoped by companyId (SaaS multi-tenant isolation):
 * a query never returns or mutates an outlet belonging to another company.
 */
export abstract class OutletRepository {
  /** Persist a new outlet and return the created record. */
  abstract addOutlet(data: NewOutletData, companyId: string): Promise<Outlet>;

  /** Generate a unique sequential outlet code within a company (e.g. "OUT-001"). */
  abstract generateOutletCode(companyId: string): Promise<string>;

  /** List outlets for a company with pagination + optional filters. */
  abstract getOutletsByCompany(
    companyId: string,
    filter: OutletListFilter,
  ): Promise<OutletListResult>;

  /** Fetch a single outlet scoped to a company. Throws OUTLET.NOT_FOUND. */
  abstract getOutletById(id: string, companyId: string): Promise<Outlet>;

  /** Update an outlet scoped to a company. Throws OUTLET.NOT_FOUND. */
  abstract updateOutlet(
    id: string,
    companyId: string,
    fields: UpdateOutletFields,
  ): Promise<Outlet>;

  /** Soft-delete an outlet scoped to a company. Throws OUTLET.NOT_FOUND. */
  abstract softDeleteOutlet(id: string, companyId: string): Promise<void>;

  /**
   * Ensure every id in outletIds is a non-deleted outlet of the company.
   * Throws OUTLET.NOT_FOUND if any id is missing or belongs to another tenant.
   */
  abstract verifyOutletsBelongToCompany(
    companyId: string,
    outletIds: string[],
  ): Promise<void>;
}
