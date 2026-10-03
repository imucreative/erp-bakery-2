import { Pool, PoolClient } from 'pg';
import {
  ProductionOrderRepository,
  NewProductionOrderData,
  ProductionOrderListFilter,
  ProductionOrderListResult,
  ProducibleResult,
  ProducibleIngredient,
} from '../../Domains/production/ProductionOrderRepository';
import {
  ProductionOrder,
  ProductionMaterial,
  ProductionResult,
} from '../../Domains/production/entities/ProductionOrder';
import { ProductionStatus } from '../../Domains/production/productionStatus';
import {
  scaledIngredientConsumption,
  ingredientRequirementPerUnit,
} from '../../Domains/production/productionConsumption';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';

interface HeaderRow {
  id: string;
  company_id: string;
  outlet_id: string;
  production_number: string;
  recipe_id: string;
  product_id: string;
  scale_factor: string;
  scheduled_qty: string;
  actual_qty: string | null;
  waste_qty: string;
  production_date: Date;
  result_expired_date: Date | null;
  status: string;
  notes: string | null;
  result_batch_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface MaterialRow {
  id: string;
  recipe_item_id: string | null;
  product_id: string;
  batch_id: string;
  planned_qty: string;
  qty_consumed: string;
}

interface ResultRow {
  id: string;
  product_id: string;
  batch_id: string;
  batch_number: string;
  expired_date: Date;
  qty_produced: string;
}

interface RecipeHeaderRow {
  id: string;
  product_id: string;
  yield_qty: string;
  status: string;
}

interface RecipeItemRow {
  id: string;
  ingredient_product_id: string;
  qty: string;
  loss_percentage: string;
}

interface BatchRow {
  id: string;
  batch_number: string;
  lot_key: string;
  expired_date: Date | null;
  qty_available: string;
}

const HEADER_COLUMNS = `id, company_id, outlet_id, production_number, recipe_id, product_id, scale_factor, scheduled_qty, actual_qty, waste_qty, production_date, result_expired_date, status, notes, result_batch_id, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of ProductionOrderRepository.
 * Raw SQL via pg — no ORM. Company-scoped for SaaS tenant isolation.
 *
 * Production is INSTANT-COMPLETE: `createInstant` runs the full production in
 * one SERIALIZABLE transaction — resolve recipe, backflush ingredients FEFO,
 * produce finished goods, persist snapshots, and land the order on COMPLETED
 * (production-domain rule #2). There are no lifecycle transitions.
 */
export class ProductionOrderRepositoryPostgres extends ProductionOrderRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toOrder(
    header: HeaderRow,
    materials: MaterialRow[] = [],
    results: ResultRow[] = [],
  ): ProductionOrder {
    return new ProductionOrder({
      id: header.id,
      companyId: header.company_id,
      outletId: header.outlet_id,
      productionNumber: header.production_number,
      recipeId: header.recipe_id,
      productId: header.product_id,
      scaleFactor: Number(header.scale_factor),
      scheduledQty: Number(header.scheduled_qty),
      actualQty: header.actual_qty === null ? null : Number(header.actual_qty),
      wasteQty: Number(header.waste_qty),
      productionDate: header.production_date,
      resultExpiredDate: header.result_expired_date,
      status: header.status as ProductionStatus,
      notes: header.notes,
      resultBatchId: header.result_batch_id,
      materials: materials.map((m) => this._toMaterial(m)),
      results: results.map((r) => this._toResult(r)),
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  private _toMaterial(row: MaterialRow): ProductionMaterial {
    return {
      id: row.id,
      recipeItemId: row.recipe_item_id,
      productId: row.product_id,
      batchId: row.batch_id,
      plannedQty: Number(row.planned_qty),
      qtyConsumed: Number(row.qty_consumed),
    };
  }

  private _toResult(row: ResultRow): ProductionResult {
    return {
      id: row.id,
      productId: row.product_id,
      batchId: row.batch_id,
      batchNumber: row.batch_number,
      expiredDate: row.expired_date,
      qtyProduced: Number(row.qty_produced),
    };
  }

  private async _generateNumber(client: PoolClient, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRD-${year}-`;
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM production_orders
       WHERE company_id = $1 AND production_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _loadMaterials(client: PoolClient, orderId: string): Promise<MaterialRow[]> {
    const result = await client.query<MaterialRow>(
      `SELECT id, recipe_item_id, product_id, batch_id, planned_qty, qty_consumed
       FROM production_order_materials
       WHERE production_order_id = $1
       ORDER BY created_at ASC`,
      [orderId],
    );
    return result.rows;
  }

  private async _loadResults(client: PoolClient, orderId: string): Promise<ResultRow[]> {
    const result = await client.query<ResultRow>(
      `SELECT id, product_id, batch_id, batch_number, expired_date, qty_produced
       FROM production_order_results
       WHERE production_order_id = $1
       ORDER BY created_at ASC`,
      [orderId],
    );
    return result.rows;
  }

  // ── Instant-complete production (backflushing, atomic) ────────────────────

  async createInstant(
    companyId: string,
    data: NewProductionOrderData,
  ): Promise<ProductionOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // Resolve the recipe: explicit recipeId wins, else the product's ACTIVE recipe.
      let recipe: RecipeHeaderRow;
      if (data.recipeId) {
        const r = await client.query<RecipeHeaderRow>(
          `SELECT id, product_id, yield_qty, status FROM recipes
           WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
          [data.recipeId, companyId],
        );
        if (!r.rowCount) {
          throw new NotFoundError('RECIPE.NOT_FOUND');
        }
        recipe = r.rows[0];
      } else {
        const r = await client.query<RecipeHeaderRow>(
          `SELECT id, product_id, yield_qty, status FROM recipes
           WHERE company_id = $1 AND product_id = $2 AND status = 'ACTIVE' AND deleted_at IS NULL`,
          [companyId, data.productId],
        );
        if (!r.rowCount) {
          throw new NotFoundError('RECIPE.NO_ACTIVE_RECIPE');
        }
        recipe = r.rows[0];
      }

      // A production order can only run against an ACTIVE recipe (domain §3/§5)
      if (recipe.status !== 'ACTIVE') {
        throw new InvariantError('PRODUCTION_ORDER.RECIPE_NOT_ACTIVE');
      }

      const yieldQty = Number(recipe.yield_qty);
      if (!(yieldQty > 0)) {
        throw new InvariantError('PRODUCTION_ORDER.RECIPE_YIELD_INVALID');
      }
      const scaleFactor = data.scheduledQty / yieldQty;

      const outletId = data.outletId;
      const bizDate = data.productionDate ?? new Date().toISOString().slice(0, 10);
      const number = await this._generateNumber(client, companyId);

      // Insert the header already COMPLETED (instant-complete, production-domain §5)
      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO production_orders
           (company_id, outlet_id, production_number, recipe_id, product_id,
            scale_factor, scheduled_qty, actual_qty, waste_qty, production_date,
            result_expired_date, status, notes, created_by, completed_by, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'COMPLETED',$12,$13,$13,NOW())
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          outletId,
          number,
          recipe.id,
          recipe.product_id,
          scaleFactor,
          data.scheduledQty,
          data.actualQty,
          data.wasteQty,
          bizDate,
          data.resultExpiredDate,
          data.notes,
          data.createdBy,
        ],
      );
      const header = headerResult.rows[0];
      const orderId = header.id;

      // Load recipe ingredient lines for backflushing
      const itemsResult = await client.query<RecipeItemRow>(
        `SELECT id, ingredient_product_id, qty, loss_percentage
         FROM recipe_items WHERE recipe_id = $1`,
        [recipe.id],
      );

      // Consume each ingredient FEFO. Quantity = base * scale * (1 + loss/100).
      for (const item of itemsResult.rows) {
        const baseQty = Number(item.qty);
        const loss = Number(item.loss_percentage);
        // Shared consumption math — identical to the producible-qty preview.
        const requiredQty = scaledIngredientConsumption(baseQty, loss, scaleFactor);
        if (!(requiredQty > 0)) continue;

        // FEFO pick under row locks (nearest expiry first, non-expired, ACTIVE)
        const batchesResult = await client.query<BatchRow>(
          `SELECT id, batch_number, lot_key, expired_date, qty_available
           FROM inventory_batches
           WHERE company_id = $1 AND outlet_id = $2 AND product_id = $3
             AND status = 'ACTIVE' AND qty_available > 0
             AND (expired_date IS NULL OR expired_date >= $4)
           ORDER BY expired_date ASC NULLS LAST, received_date ASC, created_at ASC
           FOR UPDATE`,
          [companyId, outletId, item.ingredient_product_id, bizDate],
        );

        let remaining = requiredQty;
        for (const batch of batchesResult.rows) {
          if (remaining <= 0) break;
          const available = Number(batch.qty_available);
          const take = Math.min(available, remaining);
          if (take <= 0) continue;
          const beforeQty = available;
          const afterQty = beforeQty - take;

          // Update authoritative balance + auto-consume status when depleted
          await client.query(
            `UPDATE inventory_batches
             SET qty_available = $1::numeric,
                 status = CASE WHEN $1::numeric = 0 THEN 'CONSUMED' ELSE status END,
                 updated_at = NOW()
             WHERE id = $2 AND company_id = $3`,
            [afterQty, batch.id, companyId],
          );

          // Ledger append: PRODUCTION_CONSUME. Source key = order + batch.
          await client.query(
            `INSERT INTO inventory_movements
               (company_id, outlet_id, batch_id, product_id, movement_type,
                qty, before_qty, after_qty,
                source_document_type, source_document_id,
                source_document_item_id, source_document_allocation_id, user_id)
             VALUES ($1,$2,$3,$4,'PRODUCTION_CONSUME',$5,$6,$7,'PRODUCTION_ORDER',$8,$9,$10,$11)`,
            [
              companyId,
              outletId,
              batch.id,
              item.ingredient_product_id,
              take,
              beforeQty,
              afterQty,
              orderId,
              item.id,
              batch.id,
              data.createdBy,
            ],
          );

          // Snapshot the consumption for audit/reconciliation
          await client.query(
            `INSERT INTO production_order_materials
               (production_order_id, recipe_item_id, product_id, batch_id, planned_qty, qty_consumed)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [orderId, item.id, item.ingredient_product_id, batch.id, requiredQty, take],
          );

          remaining -= take;
        }

        if (remaining > 1e-9) {
          // Negative-stock ban (rule #2): not enough ingredient to produce.
          throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
        }
      }

      let resultBatchId: string | null = null;

      // Materialise the successful output as finished goods (PRODUCTION_RESULT).
      // When actualQty is 0 (everything failed/wasted) no finished batch is made.
      const producedQty = data.actualQty;
      if (producedQty > 0) {
        if (!data.resultExpiredDate) {
          throw new InvariantError('PRODUCTION_ORDER.RESULT_EXPIRY_REQUIRED');
        }
        const resultExpiry = data.resultExpiredDate;

        // Finished-goods batch number derived from the production number
        const finishedBatchNumber = header.production_number;

        const insertBatch = await client.query<{ id: string }>(
          `INSERT INTO inventory_batches
             (company_id, outlet_id, product_id, batch_number, lot_key, lot_number,
              expired_date, received_date, qty_available, status)
           VALUES ($1,$2,$3,$4,'',NULL,$5,$6,$7,'ACTIVE')
           RETURNING id`,
          [
            companyId,
            outletId,
            header.product_id,
            finishedBatchNumber,
            resultExpiry,
            bizDate,
            producedQty,
          ],
        );
        resultBatchId = insertBatch.rows[0].id;

        await client.query(
          `INSERT INTO inventory_movements
             (company_id, outlet_id, batch_id, product_id, movement_type,
              qty, before_qty, after_qty,
              source_document_type, source_document_id, user_id)
           VALUES ($1,$2,$3,$4,'PRODUCTION_RESULT',$5,0,$5,'PRODUCTION_ORDER',$6,$7)`,
          [companyId, outletId, resultBatchId, header.product_id, producedQty, orderId, data.createdBy],
        );

        await client.query(
          `INSERT INTO production_order_results
             (production_order_id, product_id, batch_id, batch_number, expired_date, qty_produced)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderId, header.product_id, resultBatchId, finishedBatchNumber, resultExpiry, producedQty],
        );

        // Link the finished batch on the header
        await client.query(
          `UPDATE production_orders SET result_batch_id = $1, updated_at = NOW()
           WHERE id = $2 AND company_id = $3`,
          [resultBatchId, orderId, companyId],
        );
      }

      const materials = await this._loadMaterials(client, orderId);
      const results = await this._loadResults(client, orderId);

      await client.query('COMMIT');
      return this._toOrder({ ...header, result_batch_id: resultBatchId }, materials, results);
    } catch (err) {
      await client.query('ROLLBACK');
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new InvariantError('PRODUCTION_ORDER.NUMBER_CONFLICT');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Reads ──────────────────────────────────────────────────────────────

  async getById(id: string, companyId: string): Promise<ProductionOrder> {
    const client = await this.pool.connect();
    try {
      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM production_orders
         WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PRODUCTION_ORDER.NOT_FOUND');
      }
      const materials = await this._loadMaterials(client, id);
      const results = await this._loadResults(client, id);
      return this._toOrder(headerResult.rows[0], materials, results);
    } finally {
      client.release();
    }
  }

  async list(
    companyId: string,
    filter: ProductionOrderListFilter,
  ): Promise<ProductionOrderListResult> {
    const conditions: string[] = ['company_id = $1'];
    const params: unknown[] = [companyId];

    if (filter.outletId) {
      params.push(filter.outletId);
      conditions.push(`outlet_id = $${params.length}`);
    }
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
      conditions.push(`production_number ILIKE $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM production_orders WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM production_orders
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    // List returns headers only (materials/results loaded on detail)
    return { rows: headerResult.rows.map((h) => this._toOrder(h)), total };
  }

  // ── Producible quantity (read-only capacity preview) ──────────────────────

  async getProducible(
    companyId: string,
    productId: string,
    outletId: string,
  ): Promise<ProducibleResult> {
    // Resolve the single ACTIVE recipe for the finished product (company-scoped).
    const recipeResult = await this.pool.query<{
      id: string;
      recipe_number: string;
      name: string;
      yield_qty: string;
      yield_uom_id: string;
    }>(
      `SELECT id, recipe_number, name, yield_qty, yield_uom_id
       FROM recipes
       WHERE company_id = $1 AND product_id = $2 AND status = 'ACTIVE' AND deleted_at IS NULL`,
      [companyId, productId],
    );
    if (!recipeResult.rowCount) {
      throw new NotFoundError('RECIPE.NO_ACTIVE_RECIPE');
    }
    const recipeRow = recipeResult.rows[0];
    const yieldQty = Number(recipeRow.yield_qty);
    if (!(yieldQty > 0)) {
      throw new InvariantError('PRODUCTION_ORDER.RECIPE_YIELD_INVALID');
    }

    // Recipe ingredient lines (per-batch base qty + loss% + uom)
    const itemsResult = await this.pool.query<{
      ingredient_product_id: string;
      qty: string;
      loss_percentage: string;
      uom_id: string;
    }>(
      `SELECT ingredient_product_id, qty, loss_percentage, uom_id
       FROM recipe_items WHERE recipe_id = $1`,
      [recipeRow.id],
    );

    // Stock on hand per ingredient at the outlet — sum of ACTIVE batch balances
    // (same source of truth as Stock On Hand, rule #8). Grouped per product.
    const stockResult = await this.pool.query<{ product_id: string; qty_available: string }>(
      `SELECT product_id, COALESCE(SUM(qty_available), 0) AS qty_available
       FROM inventory_batches
       WHERE company_id = $1 AND outlet_id = $2 AND status = 'ACTIVE'
       GROUP BY product_id`,
      [companyId, outletId],
    );
    const stockByProduct = new Map<string, number>();
    for (const row of stockResult.rows) {
      stockByProduct.set(row.product_id, Number(row.qty_available));
    }

    const items: ProducibleIngredient[] = [];
    let producibleQty: number | null = null;

    for (const item of itemsResult.rows) {
      const baseQty = Number(item.qty);
      const loss = Number(item.loss_percentage);
      // Shared consumption math — identical to instant-complete backflushing.
      const requiredPerUnit = ingredientRequirementPerUnit(baseQty, loss, yieldQty);
      const availableQty = stockByProduct.get(item.ingredient_product_id) ?? 0;

      // Zero/negative requirement lines do not consume stock, so they never
      // constrain capacity. Report them (maxUnits unbounded) but exclude from MIN.
      if (!(requiredPerUnit > 0)) {
        items.push({
          ingredientProductId: item.ingredient_product_id,
          uomId: item.uom_id,
          requiredPerUnit: 0,
          availableQty,
          maxUnits: Number.MAX_SAFE_INTEGER,
          isLimiting: false,
        });
        continue;
      }

      // Whole finished units this ingredient can support (floor — integer output).
      const maxUnits = Math.floor(availableQty / requiredPerUnit);
      producibleQty = producibleQty === null ? maxUnits : Math.min(producibleQty, maxUnits);

      items.push({
        ingredientProductId: item.ingredient_product_id,
        uomId: item.uom_id,
        requiredPerUnit,
        availableQty,
        maxUnits,
        isLimiting: false,
      });
    }

    // No constraining ingredients at all (empty recipe or every line is 0-req) → 0.
    const finalProducible = producibleQty ?? 0;

    // Flag the limiting ingredient(s): those whose maxUnits equals producibleQty.
    for (const line of items) {
      if (line.requiredPerUnit > 0 && line.maxUnits === finalProducible) {
        line.isLimiting = true;
      }
    }

    return {
      recipe: {
        id: recipeRow.id,
        recipeNumber: recipeRow.recipe_number,
        name: recipeRow.name,
        yieldQty,
        yieldUomId: recipeRow.yield_uom_id,
      },
      producibleQty: finalProducible,
      items,
    };
  }
}
