import { Pool } from 'pg';
import {
  ProductUomConversionRepository,
  NewProductUomConversionData,
} from '../../Domains/product-uom-conversions/ProductUomConversionRepository';
import { ProductUomConversion } from '../../Domains/product-uom-conversions/entities/ProductUomConversion';
import { UpdateProductUomConversionFields } from '../../Domains/product-uom-conversions/entities/UpdateProductUomConversion';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface ConversionRow {
  id: string;
  company_id: string;
  product_id: string;
  uom_id: string;
  factor_to_base: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  uom_code: string | null;
  uom_name: string | null;
}

/**
 * SELECT list that joins `uoms` to expose the alternate unit's code/name for
 * display. The join does not filter soft-deleted UOMs (LEFT JOIN) so a
 * conversion row remains readable even if its UOM was later soft-deleted.
 */
const SELECT_WITH_UOM = `
  c.id, c.company_id, c.product_id, c.uom_id, c.factor_to_base, c.is_active,
  c.created_at, c.updated_at, u.code AS uom_code, u.name AS uom_name
`;

/**
 * Concrete PostgreSQL implementation of ProductUomConversionRepository.
 * Raw SQL via pg Pool — no ORM. Scoped by company_id. Pure data access.
 */
export class ProductUomConversionRepositoryPostgres extends ProductUomConversionRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toEntity(row: ConversionRow): ProductUomConversion {
    return new ProductUomConversion({
      id: row.id,
      companyId: row.company_id,
      productId: row.product_id,
      uomId: row.uom_id,
      factorToBase: row.factor_to_base,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      uomCode: row.uom_code,
      uomName: row.uom_name,
    });
  }

  async listByProduct(productId: string, companyId: string): Promise<ProductUomConversion[]> {
    const result = await this.pool.query<ConversionRow>(
      `SELECT ${SELECT_WITH_UOM}
       FROM product_uom_conversions c
       LEFT JOIN uoms u ON u.id = c.uom_id
       WHERE c.product_id = $1 AND c.company_id = $2
       ORDER BY c.created_at ASC`,
      [productId, companyId],
    );

    return result.rows.map((row) => this._toEntity(row));
  }

  async getById(
    id: string,
    productId: string,
    companyId: string,
  ): Promise<ProductUomConversion> {
    const result = await this.pool.query<ConversionRow>(
      `SELECT ${SELECT_WITH_UOM}
       FROM product_uom_conversions c
       LEFT JOIN uoms u ON u.id = c.uom_id
       WHERE c.id = $1 AND c.product_id = $2 AND c.company_id = $3`,
      [id, productId, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT_UOM_CONVERSION.NOT_FOUND');
    }

    return this._toEntity(result.rows[0]);
  }

  async add(
    data: NewProductUomConversionData,
    companyId: string,
  ): Promise<ProductUomConversion> {
    let inserted: { id: string };
    try {
      const result = await this.pool.query<{ id: string }>(
        `INSERT INTO product_uom_conversions (company_id, product_id, uom_id, factor_to_base, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [companyId, data.productId, data.uomId, data.factorToBase, data.isActive],
      );
      inserted = result.rows[0];
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictError('PRODUCT_UOM_CONVERSION.DUPLICATE');
      }
      throw err;
    }

    return this.getById(inserted.id, data.productId, companyId);
  }

  async update(
    id: string,
    productId: string,
    companyId: string,
    fields: UpdateProductUomConversionFields,
  ): Promise<ProductUomConversion> {
    // Ensures the row exists within product + company before mutating.
    await this.getById(id, productId, companyId);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    const columnMap: Record<keyof UpdateProductUomConversionFields, string> = {
      factorToBase: 'factor_to_base',
      isActive: 'is_active',
    };

    for (const key of Object.keys(columnMap) as (keyof UpdateProductUomConversionFields)[]) {
      if (fields[key] !== undefined) {
        params.push(fields[key] as unknown);
        setClauses.push(`${columnMap[key]} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      return this.getById(id, productId, companyId);
    }

    setClauses.push('updated_at = NOW()');
    params.push(id, productId, companyId);

    await this.pool.query(
      `UPDATE product_uom_conversions
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 2} AND product_id = $${params.length - 1} AND company_id = $${params.length}`,
      params,
    );

    return this.getById(id, productId, companyId);
  }

  async remove(id: string, productId: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM product_uom_conversions
       WHERE id = $1 AND product_id = $2 AND company_id = $3`,
      [id, productId, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT_UOM_CONVERSION.NOT_FOUND');
    }
  }
}
