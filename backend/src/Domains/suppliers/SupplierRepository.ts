import { Supplier } from './entities/Supplier';
import { UpdateSupplierFields } from './entities/UpdateSupplier';

export interface SupplierListFilter {
  limit: number;
  offset: number;
  search?: string;
  isActive?: boolean;
}

export interface SupplierListResult {
  rows: Supplier[];
  total: number;
}

export interface NewSupplierData {
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  picName: string | null;
}

/**
 * Abstract repository interface — Supplier domain.
 * Every read/write is scoped by companyId (SaaS multi-tenant isolation).
 */
export abstract class SupplierRepository {
  abstract addSupplier(data: NewSupplierData, companyId: string): Promise<Supplier>;
  abstract generateSupplierCode(companyId: string): Promise<string>;
  abstract getSuppliersByCompany(
    companyId: string,
    filter: SupplierListFilter,
  ): Promise<SupplierListResult>;
  abstract getSupplierById(id: string, companyId: string): Promise<Supplier>;
  abstract updateSupplier(
    id: string,
    companyId: string,
    fields: UpdateSupplierFields,
  ): Promise<Supplier>;
  abstract softDeleteSupplier(id: string, companyId: string): Promise<void>;

  /**
   * Count active (non-deleted) products referencing this supplier. Used to
   * enforce master-data dependency protection (block delete/deactivate when > 0).
   */
  abstract countActiveDependents(id: string, companyId: string): Promise<number>;
}
