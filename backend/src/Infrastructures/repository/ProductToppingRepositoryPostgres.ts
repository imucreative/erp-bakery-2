import { Pool } from 'pg';
import {
  ProductToppingRepository,
  NewProductToppingData,
} from '../../Domains/product-toppings/ProductToppingRepository';
import { ProductTopping } from '../../Domains/product-toppings/entities/ProductTopping';
import { UpdateProductToppingFields } from '../../Domains/product-toppings/entities/UpdateProductTopping';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface ToppingRow {
  id: string;
  company_id: string;
  product_id: string;
  topping_product_id: string;
  default_qty_per_item: string;
  extra_price: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  topping_name: string | null;
  topping_sku: string | null;
  uom_id: string | null;
  uom_code: string | null;
}

/**
 * SELECT list that joins `products` (topping product) for display name/sku and
 * `uoms` for the topping's master unit code. LEFT JOINs keep a topping row
 * readable even if the topping product/uom was later soft-deleted.
 */
const SELECT_WITH_JOINS = `
  t.id, t.company_id, t.product_id, t.topping_product_id,
  t.default_qty_per_item, t.extra_price, t.sort_order, t.is_active, t.created_at,
  tp.name AS topping_name, tp.sku AS topping_sku,
  tp.uom_id AS uom_id, u.code AS uom_code
`;

/**
 * Concrete PostgreSQL implementation of ProductToppingRepository.
 * Raw SQL via pg Pool — no ORM. Scoped by company_id. Pure data access.
 */
export class ProductToppingRepositoryPostgres extends ProductToppingRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toEntity(row: ToppingRow): ProductTopping {
    return new ProductTopping({
      id: row.id,
      companyId: row.company_id,
      productId: row.product_id,
      toppingProductId: row.topping_product_id,
      defaultQtyPerItem: row.default_qty_per_item,
      extraPrice: row.extra_price,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      toppingName: row.topping_name,
      toppingSku: row.topping_sku,
      uomId: row.uom_id,
      uomCode: row.uom_code,
    });
  }

  async listByProduct(productId: string, companyId: string): Promise<ProductTopping[]> {
    const result = await this.pool.query<ToppingRow>(
      `SELECT ${SELECT_WITH_JOINS}
       FROM product_toppings t
       LEFT JOIN products tp ON tp.id = t.topping_product_id
       LEFT JOIN uoms u ON u.id = tp.uom_id
       WHERE t.product_id = $1 AND t.company_id = $2
       ORDER BY t.sort_order ASC, tp.name ASC, t.created_at ASC`,
      [productId, companyId],
    );

    return result.rows.map((row) => this._toEntity(row));
  }

  async getById(id: string, productId: string, companyId: string): Promise<ProductTopping> {
    const result = await this.pool.query<ToppingRow>(
      `SELECT ${SELECT_WITH_JOINS}
       FROM product_toppings t
       LEFT JOIN products tp ON tp.id = t.topping_product_id
       LEFT JOIN uoms u ON u.id = tp.uom_id
       WHERE t.id = $1 AND t.product_id = $2 AND t.company_id = $3`,
      [id, productId, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT_TOPPING.NOT_FOUND');
    }

    return this._toEntity(result.rows[0]);
  }

  async add(data: NewProductToppingData, companyId: string): Promise<ProductTopping> {
    let inserted: { id: string };
    try {
      const result = await this.pool.query<{ id: string }>(
        `INSERT INTO product_toppings
           (company_id, product_id, topping_product_id, default_qty_per_item, extra_price, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          companyId,
          data.productId,
          data.toppingProductId,
          data.defaultQtyPerItem,
          data.extraPrice,
          data.sortOrder,
          data.isActive,
        ],
      );
      inserted = result.rows[0];
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new ConflictError('PRODUCT_TOPPING.DUPLICATE');
      }
      throw err;
    }

    return this.getById(inserted.id, data.productId, companyId);
  }

  async update(
    id: string,
    productId: string,
    companyId: string,
    fields: UpdateProductToppingFields,
  ): Promise<ProductTopping> {
    // Ensures the row exists within product + company before mutating.
    await this.getById(id, productId, companyId);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    const columnMap: Record<keyof UpdateProductToppingFields, string> = {
      defaultQtyPerItem: 'default_qty_per_item',
      extraPrice: 'extra_price',
      sortOrder: 'sort_order',
      isActive: 'is_active',
    };

    for (const key of Object.keys(columnMap) as (keyof UpdateProductToppingFields)[]) {
      if (fields[key] !== undefined) {
        params.push(fields[key] as unknown);
        setClauses.push(`${columnMap[key]} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      return this.getById(id, productId, companyId);
    }

    params.push(id, productId, companyId);

    await this.pool.query(
      `UPDATE product_toppings
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 2} AND product_id = $${params.length - 1} AND company_id = $${params.length}`,
      params,
    );

    return this.getById(id, productId, companyId);
  }

  async remove(id: string, productId: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM product_toppings
       WHERE id = $1 AND product_id = $2 AND company_id = $3`,
      [id, productId, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT_TOPPING.NOT_FOUND');
    }
  }
}
