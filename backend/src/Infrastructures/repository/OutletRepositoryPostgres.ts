import { Pool } from 'pg';
import {
  OutletRepository,
  OutletListFilter,
  OutletListResult,
  NewOutletData,
} from '../../Domains/outlets/OutletRepository';
import { Outlet } from '../../Domains/outlets/entities/Outlet';
import { UpdateOutletFields } from '../../Domains/outlets/entities/UpdateOutlet';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

interface OutletRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Concrete PostgreSQL implementation of OutletRepository.
 * All queries use raw SQL via pg Pool — no ORM. Every statement is scoped
 * by company_id and excludes soft-deleted rows.
 */
export class OutletRepositoryPostgres extends OutletRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toOutlet(row: OutletRow): Outlet {
    return new Outlet({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      address: row.address,
      phone: row.phone,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async addOutlet(data: NewOutletData, companyId: string): Promise<Outlet> {
    const result = await this.pool.query<OutletRow>(
      `INSERT INTO outlets (company_id, code, name, address, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, code, name, address, phone, is_active, created_at, updated_at`,
      [companyId, data.code, data.name, data.address, data.phone],
    );

    return this._toOutlet(result.rows[0]);
  }

  async generateOutletCode(companyId: string): Promise<string> {
    // Count all of the company's outlets (including soft-deleted) for uniqueness
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM outlets WHERE company_id = $1`,
      [companyId],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `OUT-${String(seq).padStart(3, '0')}`;
  }

  async getOutletsByCompany(
    companyId: string,
    filter: OutletListFilter,
  ): Promise<OutletListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(name ILIKE $${params.length} OR code ILIKE $${params.length})`);
    }

    if (filter.isActive !== undefined) {
      params.push(filter.isActive);
      conditions.push(`is_active = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM outlets WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<OutletRow>(
      `SELECT id, company_id, code, name, address, phone, is_active, created_at, updated_at
       FROM outlets
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      rows: rowsResult.rows.map((row) => this._toOutlet(row)),
      total,
    };
  }

  async getOutletById(id: string, companyId: string): Promise<Outlet> {
    const result = await this.pool.query<OutletRow>(
      `SELECT id, company_id, code, name, address, phone, is_active, created_at, updated_at
       FROM outlets
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('OUTLET.NOT_FOUND');
    }

    return this._toOutlet(result.rows[0]);
  }

  async updateOutlet(
    id: string,
    companyId: string,
    fields: UpdateOutletFields,
  ): Promise<Outlet> {
    // Ensure the outlet exists and belongs to this company before updating
    const existing = await this.getOutletById(id, companyId);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (fields.name !== undefined) {
      params.push(fields.name);
      setClauses.push(`name = $${params.length}`);
    }
    if (fields.address !== undefined) {
      params.push(fields.address);
      setClauses.push(`address = $${params.length}`);
    }
    if (fields.phone !== undefined) {
      params.push(fields.phone);
      setClauses.push(`phone = $${params.length}`);
    }
    if (fields.isActive !== undefined) {
      params.push(fields.isActive);
      setClauses.push(`is_active = $${params.length}`);
    }

    // Nothing to update — return current state
    if (setClauses.length === 0) {
      return existing;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id, companyId);

    const result = await this.pool.query<OutletRow>(
      `UPDATE outlets
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL
       RETURNING id, company_id, code, name, address, phone, is_active, created_at, updated_at`,
      params,
    );

    return this._toOutlet(result.rows[0]);
  }

  async softDeleteOutlet(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE outlets
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('OUTLET.NOT_FOUND');
    }
  }

  async verifyOutletsBelongToCompany(
    companyId: string,
    outletIds: string[],
  ): Promise<void> {
    if (outletIds.length === 0) return;

    const uniqueIds = Array.from(new Set(outletIds));
    const placeholders = uniqueIds.map((_, i) => `$${i + 2}`).join(', ');

    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM outlets
       WHERE company_id = $1 AND deleted_at IS NULL AND id IN (${placeholders})`,
      [companyId, ...uniqueIds],
    );

    if (parseInt(result.rows[0].count, 10) !== uniqueIds.length) {
      throw new NotFoundError('OUTLET.NOT_FOUND');
    }
  }
}
