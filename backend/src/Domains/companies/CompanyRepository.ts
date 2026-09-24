import { RegisterCompany } from './entities/RegisterCompany';
import { RegisteredCompany } from './entities/RegisteredCompany';

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
  abstract getCompanyById(id: string): Promise<{
    id: string;
    code: string;
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
    isActive: boolean;
  }>;

  /**
   * Generate a unique, sequential company code (e.g. "COMP-001").
   */
  abstract generateCompanyCode(): Promise<string>;
}
