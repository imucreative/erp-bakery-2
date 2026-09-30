import { PaymentTerm } from './entities/PaymentTerm';
import { UpdatePaymentTermFields } from './entities/UpdatePaymentTerm';

export interface PaymentTermListFilter {
  limit: number;
  offset: number;
  search?: string;
  isActive?: boolean;
}

export interface PaymentTermListResult {
  rows: PaymentTerm[];
  total: number;
}

export interface NewPaymentTermData {
  code: string;
  name: string;
  dueDays: number;
}

/**
 * Abstract repository interface — Payment Term domain.
 * Every read/write is scoped by companyId (SaaS multi-tenant isolation).
 */
export abstract class PaymentTermRepository {
  abstract addPaymentTerm(data: NewPaymentTermData, companyId: string): Promise<PaymentTerm>;

  /**
   * Returns true when the given (normalised) code already exists for the company
   * among non-deleted rows. Used to enforce unique code on create.
   * `excludeId` skips a specific record (reserved for future update-by-code flows).
   */
  abstract isCodeTaken(code: string, companyId: string, excludeId?: string): Promise<boolean>;

  abstract getPaymentTermsByCompany(
    companyId: string,
    filter: PaymentTermListFilter,
  ): Promise<PaymentTermListResult>;

  /** Active (non-deleted, is_active = true) payment terms for dropdown lookups. */
  abstract getActivePaymentTerms(companyId: string): Promise<PaymentTerm[]>;

  abstract getPaymentTermById(id: string, companyId: string): Promise<PaymentTerm>;

  abstract updatePaymentTerm(
    id: string,
    companyId: string,
    fields: UpdatePaymentTermFields,
  ): Promise<PaymentTerm>;

  abstract softDeletePaymentTerm(id: string, companyId: string): Promise<void>;

  /**
   * Count active (non-deleted) records referencing this payment term. Used to
   * enforce master-data dependency protection (block delete/deactivate when > 0).
   * No module references payment terms yet, so this currently returns 0; the
   * hook is kept so dependency checks can be wired in without refactoring.
   */
  abstract countActiveDependents(id: string, companyId: string): Promise<number>;
}
