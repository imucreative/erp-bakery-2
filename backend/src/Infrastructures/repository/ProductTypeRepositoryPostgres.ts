import { Pool } from 'pg';
import {
  ProductTypeRepository,
  NewProductTypeData,
} from '../../Domains/product-types/ProductTypeRepository';
import { UpdateProductTypeFields } from '../../Domains/product-types/entities/UpdateProductType';
import { ProductType } from '../../Domains/product-types/entities/ProductType';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface ProductTypeRow {
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

const SELECT_COLUMNS = `code, name, description, sort_order, is_active`;

/**
 * Concrete PostgreSQL implementation of ProductTypeRepository.
 * Global reference data (no company scope).
 */
export class ProductTypeRepositoryPostgres extends ProductTypeRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toProductType(row: ProductTypeRow): ProductType {
    return new ProductType({
      code: row.code,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order,
      isActive: row.is_active,
    });
  }

  async listActive(): Promise<ProductType[]> {
    return this._list(true);
  }

  async listAll(): Promise<ProductType[]> {
    return this._list(false);
  }

  private async _list(activeOnly: boolean): Promise<ProductType[]> {
    const result = await this.pool.query<ProductTypeRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM product_types
       ${activeOnly ? 'WHERE is_active = TRUE' : ''}
       ORDER BY name ASC`,
    );
    return result.rows.map((row) => this._toProductType(row));
  }

  async isActive(code: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM product_types WHERE code = $1 AND is_active = TRUE LIMIT 1`,
      [code],
    );
    return Boolean(result.rowCount && result.rowCount > 0);
  }

  async getByCode(code: string): Promise<ProductType> {
    const result = await this.pool.query<ProductTypeRow>(
      `SELECT ${SELECT_COLUMNS} FROM product_types WHERE code = $1`,
      [code],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT_TYPE.NOT_FOUND');
    }

    return this._toProductType(result.rows[0]);
  }

  async addProductType(data: NewProductTypeData): Promise<ProductType> {
    try {
      const result = await this.pool.query<ProductTypeRow>(
        `INSERT INTO product_types (code, name, description, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${SELECT_COLUMNS}`,
        [data.code, data.name, data.description, data.sortOrder, data.isActive],
      );

      return this._toProductType(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('PRODUCT_TYPE.CODE_ALREADY_USED');
      }
      throw error;
    }
  }

  async updateProductType(
    code: string,
    fields: UpdateProductTypeFields,
  ): Promise<ProductType> {
    const existing = await this.getByCode(code);

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
    if (fields.sortOrder !== undefined) {
      params.push(fields.sortOrder);
      setClauses.push(`sort_order = $${params.length}`);
    }
    if (fields.isActive !== undefined) {
      params.push(fields.isActive);
      setClauses.push(`is_active = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return existing;
    }

    setClauses.push('updated_at = NOW()');
    params.push(code);

    const result = await this.pool.query<ProductTypeRow>(
      `UPDATE product_types
       SET ${setClauses.join(', ')}
       WHERE code = $${params.length}
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );

    return this._toProductType(result.rows[0]);
  }

  async deleteProductType(code: string): Promise<void> {
    try {
      const result = await this.pool.query(
        `DELETE FROM product_types WHERE code = $1`,
        [code],
      );

      if (!result.rowCount || result.rowCount === 0) {
        throw new NotFoundError('PRODUCT_TYPE.NOT_FOUND');
      }
    } catch (error) {
      if (isProductTypeInUse(error)) {
        throw new ConflictError('PRODUCT_TYPE.IN_USE');
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as { code?: string }).code === '23505';
}

function isProductTypeInUse(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const pgError = error as { code?: string; constraint?: string };
  return pgError.code === '23503' && pgError.constraint === 'products_product_type_fk';
}
