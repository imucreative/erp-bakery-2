import { Pool } from 'pg';
import { ToppingRepository, NewToppingData } from '../../Domains/toppings/ToppingRepository';
import { Topping } from '../../Domains/toppings/entities/Topping';
import { UpdateToppingFields } from '../../Domains/toppings/entities/UpdateTopping';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface ToppingRow {
  id: string;
  company_id: string;
  topping_product_id: string;
  default_qty_per_item: string;
  extra_price: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  topping_name: string | null;
  topping_sku: string | null;
  uom_id: string | null;
  uom_code: string | null;
  uom_name: string | null;
}

/**
 * SELECT list that joins `products` (topping product) for display name/sku and
 * `uoms` for the topping's master unit code. LEFT JOINs keep a topping row
 * readable even if the topping product/uom was later soft-deleted.
 */
const SELECT_WITH_JOINS = `
  t.id, t.company_id, t.topping_product_id,
  t.default_qty_per_item, t.extra_price, t.sort_order, t.is_active,
  t.created_at, t.updated_at,
  tp.name AS topping_name, tp.sku AS topping_sku,
  tp.uom_id AS uom_id, u.code AS uom_code, u.name AS uom_name
`;

/**
 * Concrete PostgreSQL implementation of ToppingRepository (GLOBAL catalog).
 * Raw SQL via pg Pool — no ORM. Scoped by company_id. Pure data access.
 */
export class ToppingRepositoryPostgres extends ToppingRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toEntity(row: ToppingRow): Topping {
    return new Topping({
      id: row.id,
      companyId: row.company_id,
      toppingProductId: row.topping_product_id,
      defaultQtyPerItem: row.default_qty_per_item,
      extraPrice: row.extra_price,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      toppingName: row.topping_name,
      toppingSku: row.topping_sku,
      uomId: row.uom_id,
      uomCode: row.uom_code,
      uomName: row.uom_name,
    });
  }

  async list(companyId: string): Promise<Topping[]> {
    const result = await this.pool.query<ToppingRow>(
      `SELECT ${SELECT_WITH_JOINS}
       FROM toppings t
       LEFT JOIN products tp ON tp.id = t.topping_product_id
       LEFT JOIN uoms u ON u.id = tp.uom_id
       WHERE t.company_id = $1 AND t.deleted_at IS NULL
       ORDER BY t.sort_order ASC, tp.name ASC, t.created_at ASC`,
      [companyId],
    );
    return result.rows.map((row) => this._toEntity(row));
  }

  async listActive(companyId: string): Promise<Topping[]> {
    const result = await this.pool.query<ToppingRow>(
      `SELECT ${SELECT_WITH_JOINS}
       FROM toppings t
       LEFT JOIN products tp ON tp.id = t.topping_product_id
       LEFT JOIN uoms u ON u.id = tp.uom_id
       WHERE t.company_id = $1 AND t.deleted_at IS NULL AND t.is_active = TRUE
       ORDER BY t.sort_order ASC, tp.name ASC, t.created_at ASC`,
      [companyId],
    );
    return result.rows.map((row) => this._toEntity(row));
  }

  async getById(id: string, companyId: string): Promise<Topping> {
    const result = await this.pool.query<ToppingRow>(
      `SELECT ${SELECT_WITH_JOINS}
       FROM toppings t
       LEFT JOIN products tp ON tp.id = t.topping_product_id
       LEFT JOIN uoms u ON u.id = tp.uom_id
       WHERE t.id = $1 AND t.company_id = $2 AND t.deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('TOPPING.NOT_FOUND');
    }

    return this._toEntity(result.rows[0]);
  }

  async add(data: NewToppingData, companyId: string): Promise<Topping> {
    let inserted: { id: string };
    try {
      const result = await this.pool.query<{ id: string }>(
        `INSERT INTO toppings
           (company_id, topping_product_id, default_qty_per_item, extra_price,
            sort_order, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          companyId,
          data.toppingProductId,
          data.defaultQtyPerItem,
          data.extraPrice,
          data.sortOrder,
          data.isActive,
          data.createdBy,
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
        throw new ConflictError('TOPPING.DUPLICATE');
      }
      throw err;
    }

    return this.getById(inserted.id, companyId);
  }

  async update(
    id: string,
    companyId: string,
    fields: UpdateToppingFields,
    updatedBy: string | null,
  ): Promise<Topping> {
    // Ensures the row exists within the company before mutating.
    await this.getById(id, companyId);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    const columnMap: Record<keyof UpdateToppingFields, string> = {
      defaultQtyPerItem: 'default_qty_per_item',
      extraPrice: 'extra_price',
      sortOrder: 'sort_order',
      isActive: 'is_active',
    };

    for (const key of Object.keys(columnMap) as (keyof UpdateToppingFields)[]) {
      if (fields[key] !== undefined) {
        params.push(fields[key] as unknown);
        setClauses.push(`${columnMap[key]} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      return this.getById(id, companyId);
    }

    params.push(updatedBy);
    setClauses.push(`updated_by = $${params.length}`);
    setClauses.push('updated_at = NOW()');

    params.push(id, companyId);

    await this.pool.query(
      `UPDATE toppings
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL`,
      params,
    );

    return this.getById(id, companyId);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM toppings
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('TOPPING.NOT_FOUND');
    }
  }
}
