import { Pool } from 'pg';
import {
  SupplierRepository,
  SupplierListFilter,
  SupplierListResult,
  NewSupplierData,
} from '../../Domains/suppliers/SupplierRepository';
import { Supplier } from '../../Domains/suppliers/entities/Supplier';
import { UpdateSupplierFields } from '../../Domains/suppliers/entities/UpdateSupplier';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

interface SupplierRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  pic_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `id, company_id, code, name, address, phone, pic_name, is_active, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of SupplierRepository.
 * Raw SQL via pg Pool — no ORM. Scoped by company_id, excludes soft-deleted rows.
 */
export class SupplierRepositoryPostgres extends SupplierRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toSupplier(row: SupplierRow): Supplier {
    return new Supplier({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      address: row.address,
      phone: row.phone,
      picName: row.pic_name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async addSupplier(data: NewSupplierData, companyId: string): Promise<Supplier> {
    const result = await this.pool.query<SupplierRow>(
      `INSERT INTO suppliers (company_id, code, name, address, phone, pic_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SELECT_COLUMNS}`,
      [companyId, data.code, data.name, data.address, data.phone, data.picName],
    );

    return this._toSupplier(result.rows[0]);
  }

  async generateSupplierCode(companyId: string): Promise<string> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM suppliers WHERE company_id = $1`,
      [companyId],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `SUP-${String(seq).padStart(3, '0')}`;
  }

  async getSuppliersByCompany(
    companyId: string,
    filter: SupplierListFilter,
  ): Promise<SupplierListResult> {
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
      `SELECT COUNT(*) AS count FROM suppliers WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<SupplierRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM suppliers
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsResult.rows.map((row) => this._toSupplier(row)), total };
  }

  async getSupplierById(id: string, companyId: string): Promise<Supplier> {
    const result = await this.pool.query<SupplierRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM suppliers
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('SUPPLIER.NOT_FOUND');
    }

    return this._toSupplier(result.rows[0]);
  }

  async updateSupplier(
    id: string,
    companyId: string,
    fields: UpdateSupplierFields,
  ): Promise<Supplier> {
    const existing = await this.getSupplierById(id, companyId);

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
    if (fields.picName !== undefined) {
      params.push(fields.picName);
      setClauses.push(`pic_name = $${params.length}`);
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

    const result = await this.pool.query<SupplierRow>(
      `UPDATE suppliers
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );

    return this._toSupplier(result.rows[0]);
  }

  async softDeleteSupplier(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE suppliers
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('SUPPLIER.NOT_FOUND');
    }
  }

  async countActiveDependents(id: string, companyId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products
       WHERE supplier_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    return parseInt(result.rows[0].count, 10);
  }
}
