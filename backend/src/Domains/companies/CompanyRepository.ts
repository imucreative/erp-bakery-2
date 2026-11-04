import { RegisterCompany } from './entities/RegisterCompany';
import { RegisteredCompany } from './entities/RegisteredCompany';

/** Platform-level filters for the company list (super admin only). */
export interface CompanyListParams {
  page: number;
  limit: number;
  search?: string;
}

/** One row of the platform company list. */
export interface CompanyListItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  phone: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export interface CompanyListResult {
  rows: CompanyListItem[];
  total: number;
}

/** Full company profile (tenant scope) — used by the profile screen. */
export interface CompanyProfile {
  id: string;
  code: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  taxId: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

export interface UpdateCompanyProfileFields {
  name?: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string;
  taxId?: string | null;
  logoUrl?: string | null;
}

/**
 * Abstract repository interface — Companies domain.
 * Concrete implementation lives in Infrastructures/repository/.
 * Pattern mirrors sample-be UserRepository.
 */
export abstract class CompanyRepository {
  /**
   * Persist a new company and return the created record.
   */
  abstract addCompany(data: RegisterCompany): Promise<RegisteredCompany>;

  /**
   * Ensure no other company uses this slug.
   * Throws COMPANY.SLUG_ALREADY_USED if taken.
   */
  abstract verifyAvailableSlug(slug: string): Promise<void>;

  /**
   * Fetch company by id. Throws COMPANY.NOT_FOUND if missing or deleted.
   */
  abstract getCompanyById(id: string): Promise<CompanyProfile>;

  /**
   * Generate a unique, sequential company code (e.g. "COMP-001").
   */
  abstract generateCompanyCode(): Promise<string>;

  /**
   * List companies for the platform console (super admin only).
   * Soft-deleted companies are excluded; each row carries its active user count.
   */
  abstract listCompanies(params: CompanyListParams): Promise<CompanyListResult>;

  /**
   * Activate or suspend a company. Throws COMPANY.NOT_FOUND if missing.
   */
  abstract setCompanyActive(
    id: string,
    isActive: boolean,
  ): Promise<{ id: string; isActive: boolean }>;

  /**
   * Update the tenant company profile (address, contact, tax id, logo).
   * Throws COMPANY.NOT_FOUND if missing.
   */
  abstract updateCompanyProfile(
    id: string,
    fields: UpdateCompanyProfileFields,
  ): Promise<CompanyProfile>;
}
