import { Pool } from 'pg';
import { CompanyRepository } from '../../Domains/companies/CompanyRepository';
import { RegisterCompany } from '../../Domains/companies/entities/RegisterCompany';
import { RegisteredCompany } from '../../Domains/companies/entities/RegisteredCompany';
import { ConflictError } from '../../Commons/exceptions/ConflictError';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

/**
 * Concrete PostgreSQL implementation of CompanyRepository.
 * All queries use raw SQL via pg Pool — no ORM.
 */
export class CompanyRepositoryPostgres extends CompanyRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async addCompany(data: RegisterCompany & { code: string }): Promise<RegisteredCompany> {
    const { code, name, slug } = data;

    const result = await this.pool.query<{
      id: string;
      code: string;
      name: string;
      slug: string;
    }>(
      `INSERT INTO companies (code, name, slug)
       VALUES ($1, $2, $3)
       RETURNING id, code, name, slug`,
      [code, name, slug],
    );

    return new RegisteredCompany(result.rows[0]);
  }

  async verifyAvailableSlug(slug: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT id FROM companies WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );

    if (result.rowCount && result.rowCount > 0) {
      throw new ConflictError('COMPANY.SLUG_ALREADY_USED');
    }
  }

  async getCompanyById(id: string): Promise<{
    id: string;
    code: string;
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
    isActive: boolean;
  }> {
    const result = await this.pool.query<{
      id: string;
      code: string;
      name: string;
      slug: string;
      address: string | null;
      phone: string | null;
      is_active: boolean;
    }>(
      `SELECT id, code, name, slug, address, phone, is_active
       FROM companies
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('COMPANY.NOT_FOUND');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      slug: row.slug,
      address: row.address,
      phone: row.phone,
      isActive: row.is_active,
    };
  }

  async generateCompanyCode(): Promise<string> {
    // Count all companies (including soft-deleted) to guarantee uniqueness
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM companies`,
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `COMP-${String(seq).padStart(3, '0')}`;
  }
}
