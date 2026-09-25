import { Pool } from 'pg';
import {
  ProductGroupRepository,
  ProductGroupListFilter,
  ProductGroupListResult,
  NewProductGroupData,
} from '../../Domains/product-groups/ProductGroupRepository';
import { ProductGroup } from '../../Domains/product-groups/entities/ProductGroup';
import { UpdateProductGroupFields } from '../../Domains/product-groups/entities/UpdateProductGroup';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

interface ProductGroupRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `id, company_id, code, name, description, is_active, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of ProductGroupRepository.
 * Raw SQL via pg Pool — no ORM. Every statement is scoped by company_id and
 * excludes soft-deleted rows.
 */
export class ProductGroupRepositoryPostgres extends ProductGroupRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toProductGroup(row: ProductGroupRow): ProductGroup {
    return new ProductGroup({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async addProductGroup(
    data: NewProductGroupData,
    companyId: string,
  ): Promise<ProductGroup> {
    const result = await this.pool.query<ProductGroupRow>(
      `INSERT INTO product_groups (company_id, code, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_COLUMNS}`,
      [companyId, data.code, data.name, data.description],
    );

    return this._toProductGroup(result.rows[0]);
  }

  async generateProductGroupCode(companyId: string): Promise<string> {
    // Count all of the company's product groups (including soft-deleted) for uniqueness
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM product_groups WHERE company_id = $1`,
      [companyId],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `PG-${String(seq).padStart(3, '0')}`;
  }

  async getProductGroupsByCompany(
    companyId: string,
    filter: ProductGroupListFilter,
  ): Promise<ProductGroupListResult> {
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
      `SELECT COUNT(*) AS count FROM product_groups WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<ProductGroupRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM product_groups
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      rows: rowsResult.rows.map((row) => this._toProductGroup(row)),
      total,
    };
  }

  async getProductGroupById(id: string, companyId: string): Promise<ProductGroup> {
    const result = await this.pool.query<ProductGroupRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM product_groups
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT_GROUP.NOT_FOUND');
    }

    return this._toProductGroup(result.rows[0]);
  }

  async updateProductGroup(
    id: string,
    companyId: string,
    fields: UpdateProductGroupFields,
  ): Promise<ProductGroup> {
    const existing = await this.getProductGroupById(id, companyId);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (fields.name !== undefined) {
      params.push(fields.name);
      setClauses.push(`name = $${params.length}`);
    }
    if (fields.description !== undefined) {
      params.push(fields.description);
      setClauses.push(`description = $${params.length}`);
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

    const result = await this.pool.query<ProductGroupRow>(
      `UPDATE product_groups
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );

    return this._toProductGroup(result.rows[0]);
  }

  async softDeleteProductGroup(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE product_groups
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT_GROUP.NOT_FOUND');
    }
  }

  async countActiveDependents(id: string, companyId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT
         (SELECT COUNT(*) FROM product_categories
            WHERE product_group_id = $1 AND company_id = $2 AND deleted_at IS NULL)
         +
         (SELECT COUNT(*) FROM products
            WHERE product_group_id = $1 AND company_id = $2 AND deleted_at IS NULL)
         AS count`,
      [id, companyId],
    );

    return parseInt(result.rows[0].count, 10);
  }
}
