import { Pool } from 'pg';
import {
  CompanyRepository,
  CompanyListParams,
  CompanyListResult,
} from '../../Domains/companies/CompanyRepository';
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

  async listCompanies({ page, limit, search }: CompanyListParams): Promise<CompanyListResult> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let where = 'WHERE c.deleted_at IS NULL';

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      where += ` AND (c.name ILIKE $${params.length} OR c.code ILIKE $${params.length} OR c.slug ILIKE $${params.length})`;
    }

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM companies c ${where}`,
      params,
    );

    params.push(limit, offset);
    const result = await this.pool.query<{
      id: string;
      code: string;
      name: string;
      slug: string;
      phone: string | null;
      is_active: boolean;
      user_count: string;
      created_at: Date;
    }>(
      `SELECT
         c.id,
         c.code,
         c.name,
         c.slug,
         c.phone,
         c.is_active,
         c.created_at,
         (SELECT COUNT(*) FROM users u
          WHERE u.company_id = c.id AND u.deleted_at IS NULL) AS user_count
       FROM companies c
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      rows: result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        slug: row.slug,
        phone: row.phone,
        isActive: row.is_active,
        userCount: parseInt(row.user_count, 10),
        createdAt: row.created_at.toISOString(),
      })),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async setCompanyActive(
    id: string,
    isActive: boolean,
  ): Promise<{ id: string; isActive: boolean }> {
    const result = await this.pool.query<{ id: string; is_active: boolean }>(
      `UPDATE companies
       SET is_active = $2, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, is_active`,
      [id, isActive],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('COMPANY.NOT_FOUND');
    }

    return { id: result.rows[0].id, isActive: result.rows[0].is_active };
  }
}
