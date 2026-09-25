import { Pool } from 'pg';
import {
  UomRepository,
  UomListFilter,
  UomListResult,
  NewUomData,
} from '../../Domains/uoms/UomRepository';
import { Uom } from '../../Domains/uoms/entities/Uom';
import { UpdateUomFields } from '../../Domains/uoms/entities/UpdateUom';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

interface UomRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `id, company_id, code, name, is_active, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of UomRepository.
 * Raw SQL via pg Pool — no ORM. Scoped by company_id, excludes soft-deleted rows.
 */
export class UomRepositoryPostgres extends UomRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toUom(row: UomRow): Uom {
    return new Uom({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async addUom(data: NewUomData, companyId: string): Promise<Uom> {
    const result = await this.pool.query<UomRow>(
      `INSERT INTO uoms (company_id, code, name)
       VALUES ($1, $2, $3)
       RETURNING ${SELECT_COLUMNS}`,
      [companyId, data.code, data.name],
    );

    return this._toUom(result.rows[0]);
  }

  async generateUomCode(companyId: string): Promise<string> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM uoms WHERE company_id = $1`,
      [companyId],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `UOM-${String(seq).padStart(3, '0')}`;
  }

  async getUomsByCompany(companyId: string, filter: UomListFilter): Promise<UomListResult> {
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
      `SELECT COUNT(*) AS count FROM uoms WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<UomRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM uoms
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsResult.rows.map((row) => this._toUom(row)), total };
  }

  async getUomById(id: string, companyId: string): Promise<Uom> {
    const result = await this.pool.query<UomRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM uoms
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('UOM.NOT_FOUND');
    }

    return this._toUom(result.rows[0]);
  }

  async updateUom(id: string, companyId: string, fields: UpdateUomFields): Promise<Uom> {
    const existing = await this.getUomById(id, companyId);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (fields.name !== undefined) {
      params.push(fields.name);
      setClauses.push(`name = $${params.length}`);
    }
    if (fields.isActive !== undefined) {
      params.push(fields.isActive);
      setClauses.push(`is_active = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return existing;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id, companyId);

    const result = await this.pool.query<UomRow>(
      `UPDATE uoms
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );

    return this._toUom(result.rows[0]);
  }

  async softDeleteUom(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE uoms
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('UOM.NOT_FOUND');
    }
  }

  async countActiveDependents(id: string, companyId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products
       WHERE uom_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    return parseInt(result.rows[0].count, 10);
  }
}
