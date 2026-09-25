import { Pool } from 'pg';
import {
  CategoryRepository,
  CategoryListFilter,
  CategoryListResult,
  NewCategoryData,
} from '../../Domains/categories/CategoryRepository';
import { ProductCategory } from '../../Domains/categories/entities/ProductCategory';
import { UpdateCategoryFields } from '../../Domains/categories/entities/UpdateCategory';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

interface CategoryRow {
  id: string;
  company_id: string;
  product_group_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `id, company_id, product_group_id, code, name, description, is_active, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of CategoryRepository.
 * Raw SQL via pg Pool — no ORM. Scoped by company_id, excludes soft-deleted rows.
 */
export class CategoryRepositoryPostgres extends CategoryRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toCategory(row: CategoryRow): ProductCategory {
    return new ProductCategory({
      id: row.id,
      companyId: row.company_id,
      productGroupId: row.product_group_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async addCategory(data: NewCategoryData, companyId: string): Promise<ProductCategory> {
    const result = await this.pool.query<CategoryRow>(
      `INSERT INTO product_categories (company_id, product_group_id, code, name, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS}`,
      [companyId, data.productGroupId, data.code, data.name, data.description],
    );

    return this._toCategory(result.rows[0]);
  }

  async generateCategoryCode(companyId: string): Promise<string> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM product_categories WHERE company_id = $1`,
      [companyId],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `PC-${String(seq).padStart(3, '0')}`;
  }

  async getCategoriesByCompany(
    companyId: string,
    filter: CategoryListFilter,
  ): Promise<CategoryListResult> {
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

    if (filter.productGroupId) {
      params.push(filter.productGroupId);
      conditions.push(`product_group_id = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM product_categories WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<CategoryRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM product_categories
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsResult.rows.map((row) => this._toCategory(row)), total };
  }

  async getCategoryById(id: string, companyId: string): Promise<ProductCategory> {
    const result = await this.pool.query<CategoryRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM product_categories
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('CATEGORY.NOT_FOUND');
    }

    return this._toCategory(result.rows[0]);
  }

  async updateCategory(
    id: string,
    companyId: string,
    fields: UpdateCategoryFields,
  ): Promise<ProductCategory> {
    const existing = await this.getCategoryById(id, companyId);

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

    const result = await this.pool.query<CategoryRow>(
      `UPDATE product_categories
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );

    return this._toCategory(result.rows[0]);
  }

  async softDeleteCategory(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE product_categories
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('CATEGORY.NOT_FOUND');
    }
  }

  async countActiveDependents(id: string, companyId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products
       WHERE category_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    return parseInt(result.rows[0].count, 10);
  }
}
