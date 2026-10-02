import { Pool, PoolClient } from 'pg';
import {
  RecipeRepository,
  NewRecipeData,
  RecipeListFilter,
  RecipeListResult,
} from '../../Domains/recipes/RecipeRepository';
import { Recipe, RecipeItem } from '../../Domains/recipes/entities/Recipe';
import { RecipeStatus, canTransition } from '../../Domains/recipes/recipeStatus';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface HeaderRow {
  id: string;
  company_id: string;
  recipe_number: string;
  name: string;
  product_id: string;
  version: number;
  yield_qty: string;
  yield_uom_id: string;
  instructions: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  ingredient_product_id: string;
  qty: string;
  uom_id: string;
  loss_percentage: string;
}

const HEADER_COLUMNS = `id, company_id, recipe_number, name, product_id, version, yield_qty, yield_uom_id, instructions, status, created_at, updated_at`;
const ITEM_COLUMNS = `id, ingredient_product_id, qty, uom_id, loss_percentage`;

/**
 * Concrete PostgreSQL implementation of RecipeRepository.
 * Raw SQL, company-scoped, soft-deletable.
 */
export class RecipeRepositoryPostgres extends RecipeRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toItem(row: ItemRow): RecipeItem {
    return {
      id: row.id,
      ingredientProductId: row.ingredient_product_id,
      qty: Number(row.qty),
      uomId: row.uom_id,
      lossPercentage: Number(row.loss_percentage),
    };
  }

  private _toRecipe(header: HeaderRow, items: ItemRow[]): Recipe {
    return new Recipe({
      id: header.id,
      companyId: header.company_id,
      recipeNumber: header.recipe_number,
      name: header.name,
      productId: header.product_id,
      version: header.version,
      yieldQty: Number(header.yield_qty),
      yieldUomId: header.yield_uom_id,
      instructions: header.instructions,
      status: header.status as RecipeStatus,
      items: items.map((i) => this._toItem(i)),
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  private async _generateNumber(client: PoolClient, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM recipes
       WHERE company_id = $1 AND recipe_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _loadItems(client: PoolClient, recipeId: string): Promise<ItemRow[]> {
    const result = await client.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM recipe_items
       WHERE recipe_id = $1 ORDER BY created_at ASC`,
      [recipeId],
    );
    return result.rows;
  }

  private async _insertItems(
    client: PoolClient,
    recipeId: string,
    items: NewRecipeData['items'],
  ): Promise<void> {
    for (const item of items) {
      await client.query(
        `INSERT INTO recipe_items
           (recipe_id, ingredient_product_id, qty, uom_id, loss_percentage)
         VALUES ($1, $2, $3, $4, $5)`,
        [recipeId, item.ingredientProductId, item.qty, item.uomId, item.lossPercentage],
      );
    }
  }

  async createDraft(companyId: string, data: NewRecipeData): Promise<Recipe> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const number = await this._generateNumber(client, companyId);
      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO recipes
           (company_id, recipe_number, name, product_id, version, yield_qty, yield_uom_id, instructions, status)
         VALUES ($1,$2,$3,$4,1,$5,$6,$7,'DRAFT')
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          number,
          data.name,
          data.productId,
          data.yieldQty,
          data.yieldUomId,
          data.instructions,
        ],
      );
      const header = headerResult.rows[0];
      await this._insertItems(client, header.id, data.items);
      const items = await this._loadItems(client, header.id);
      await client.query('COMMIT');
      return this._toRecipe(header, items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateDraft(id: string, companyId: string, data: NewRecipeData): Promise<Recipe> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM recipes
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('RECIPE.NOT_FOUND');
      }
      if (headerResult.rows[0].status !== 'DRAFT') {
        throw new InvariantError('RECIPE.ONLY_DRAFT_EDITABLE');
      }

      const updatedHeader = await client.query<HeaderRow>(
        `UPDATE recipes
         SET name = $1, product_id = $2, yield_qty = $3, yield_uom_id = $4,
             instructions = $5, updated_at = NOW()
         WHERE id = $6 AND company_id = $7
         RETURNING ${HEADER_COLUMNS}`,
        [
          data.name,
          data.productId,
          data.yieldQty,
          data.yieldUomId,
          data.instructions,
          id,
          companyId,
        ],
      );

      await client.query(`DELETE FROM recipe_items WHERE recipe_id = $1`, [id]);
      await this._insertItems(client, id, data.items);

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toRecipe(updatedHeader.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<Recipe> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM recipes
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('RECIPE.NOT_FOUND');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM recipe_items WHERE recipe_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return this._toRecipe(headerResult.rows[0], itemsResult.rows);
  }

  async list(companyId: string, filter: RecipeListFilter): Promise<RecipeListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.productId) {
      params.push(filter.productId);
      conditions.push(`product_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(name ILIKE $${params.length} OR recipe_number ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM recipes WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM recipes
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const rows: Recipe[] = [];
    for (const header of headerResult.rows) {
      const itemsResult = await this.pool.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM recipe_items WHERE recipe_id = $1 ORDER BY created_at ASC`,
        [header.id],
      );
      rows.push(this._toRecipe(header, itemsResult.rows));
    }

    return { rows, total };
  }

  async activate(id: string, companyId: string): Promise<Recipe> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM recipes
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('RECIPE.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (!canTransition(header.status as RecipeStatus, 'ACTIVE')) {
        throw new InvariantError('RECIPE.INVALID_STATUS_TRANSITION');
      }

      // Explicit check for an existing active recipe on the same product
      const activeClash = await client.query(
        `SELECT id FROM recipes
         WHERE company_id = $1 AND product_id = $2 AND status = 'ACTIVE'
           AND deleted_at IS NULL AND id <> $3`,
        [companyId, header.product_id, id],
      );
      if (activeClash.rowCount && activeClash.rowCount > 0) {
        throw new ConflictError('RECIPE.ACTIVE_ALREADY_EXISTS');
      }

      let updated: HeaderRow;
      try {
        const updatedResult = await client.query<HeaderRow>(
          `UPDATE recipes SET status = 'ACTIVE', updated_at = NOW()
           WHERE id = $1 AND company_id = $2
           RETURNING ${HEADER_COLUMNS}`,
          [id, companyId],
        );
        updated = updatedResult.rows[0];
      } catch (e) {
        // Partial unique index guards against a race; translate to domain error
        if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === '23505') {
          throw new ConflictError('RECIPE.ACTIVE_ALREADY_EXISTS');
        }
        throw e;
      }

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toRecipe(updated, items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async archive(id: string, companyId: string): Promise<Recipe> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM recipes
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('RECIPE.NOT_FOUND');
      }
      if (!canTransition(headerResult.rows[0].status as RecipeStatus, 'ARCHIVED')) {
        throw new InvariantError('RECIPE.INVALID_STATUS_TRANSITION');
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE recipes SET status = 'ARCHIVED', updated_at = NOW()
         WHERE id = $1 AND company_id = $2
         RETURNING ${HEADER_COLUMNS}`,
        [id, companyId],
      );

      const items = await this._loadItems(client, id);
      await client.query('COMMIT');
      return this._toRecipe(updated.rows[0], items);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async softDelete(id: string, companyId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM recipes
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('RECIPE.NOT_FOUND');
      }
      if (headerResult.rows[0].status !== 'DRAFT') {
        throw new InvariantError('RECIPE.ONLY_DRAFT_DELETABLE');
      }

      // recipes table carries only deleted_at (no deleted_by column). Items are
      // hidden implicitly: all recipe reads filter the header by deleted_at.
      await client.query(
        `UPDATE recipes SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getActiveByProduct(productId: string, companyId: string): Promise<Recipe> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM recipes
       WHERE company_id = $1 AND product_id = $2 AND status = 'ACTIVE' AND deleted_at IS NULL`,
      [companyId, productId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('RECIPE.NO_ACTIVE_RECIPE');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM recipe_items WHERE recipe_id = $1 ORDER BY created_at ASC`,
      [headerResult.rows[0].id],
    );
    return this._toRecipe(headerResult.rows[0], itemsResult.rows);
  }
}
