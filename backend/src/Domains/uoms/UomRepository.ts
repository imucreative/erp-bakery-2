import { Uom } from './entities/Uom';
import { UpdateUomFields } from './entities/UpdateUom';

export interface UomListFilter {
  limit: number;
  offset: number;
  search?: string;
  isActive?: boolean;
}

export interface UomListResult {
  rows: Uom[];
  total: number;
}

export interface NewUomData {
  code: string;
  name: string;
}

/**
 * Abstract repository interface — UOM domain.
 * Every read/write is scoped by companyId (SaaS multi-tenant isolation).
 */
export abstract class UomRepository {
  abstract addUom(data: NewUomData, companyId: string): Promise<Uom>;
  abstract generateUomCode(companyId: string): Promise<string>;
  abstract getUomsByCompany(companyId: string, filter: UomListFilter): Promise<UomListResult>;
  abstract getUomById(id: string, companyId: string): Promise<Uom>;
  abstract updateUom(id: string, companyId: string, fields: UpdateUomFields): Promise<Uom>;
  abstract softDeleteUom(id: string, companyId: string): Promise<void>;

  /**
   * Count active (non-deleted) products referencing this UOM. Used to enforce
   * master-data dependency protection (block delete/deactivate when > 0).
   */
  abstract countActiveDependents(id: string, companyId: string): Promise<number>;
}
