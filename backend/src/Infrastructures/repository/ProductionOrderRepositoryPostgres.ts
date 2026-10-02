import { Pool, PoolClient } from 'pg';
import {
  ProductionOrderRepository,
  NewProductionOrderData,
  RecordYieldData,
  ProductionOrderListFilter,
  ProductionOrderListResult,
} from '../../Domains/production/ProductionOrderRepository';
import {
  ProductionOrder,
  ProductionMaterial,
  ProductionResult,
} from '../../Domains/production/entities/ProductionOrder';
import { ProductionStatus, canTransition } from '../../Domains/production/productionStatus';
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
  qa_notes: string | null;
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

const HEADER_COLUMNS = `id, company_id, outlet_id, production_number, recipe_id, product_id, scale_factor, scheduled_qty, actual_qty, waste_qty, production_date, result_expired_date, status, qa_notes, notes, result_batch_id, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of ProductionOrderRepository.
 * Raw SQL via pg — no ORM. Company-scoped for SaaS tenant isolation.
 *
 * Lifecycle transitions lock the header row FOR UPDATE and re-validate with
 * productionStatus.canTransition. `complete` performs backflushing atomically
 * under SERIALIZABLE isolation (production-domain rule #2).
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
      qaNotes: header.qa_notes,
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

  // ── Scheduling ───────────────────────────────────────────────────────────

  async schedule(companyId: string, data: NewProductionOrderData): Promise<ProductionOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

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

      const number = await this._generateNumber(client, companyId);
      const productionDate = data.productionDate ?? new Date().toISOString().slice(0, 10);

      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO production_orders
           (company_id, outlet_id, production_number, recipe_id, product_id,
            scale_factor, scheduled_qty, waste_qty, production_date, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,'SCHEDULED',$9,$10)
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          data.outletId,
          number,
          recipe.id,
          recipe.product_id,
          scaleFactor,
          data.scheduledQty,
          productionDate,
          data.notes,
          data.createdBy,
        ],
      );

      await client.query('COMMIT');
      return this._toOrder(headerResult.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
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

  // ── Simple lifecycle transitions ─────────────────────────────────────────

  private async _transition(
    id: string,
    companyId: string,
    to: ProductionStatus,
    extraSet: string,
    extraParams: unknown[],
  ): Promise<ProductionOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM production_orders
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PRODUCTION_ORDER.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (!canTransition(header.status as ProductionStatus, to)) {
        throw new InvariantError('PRODUCTION_ORDER.INVALID_STATUS_TRANSITION');
      }

      // params: [ ...extraParams, id, companyId ]; status is inlined literal
      const idPos = extraParams.length + 1;
      const companyPos = extraParams.length + 2;
      const updated = await client.query<HeaderRow>(
        `UPDATE production_orders
         SET status = '${to}', ${extraSet} updated_at = NOW()
         WHERE id = $${idPos} AND company_id = $${companyPos}
         RETURNING ${HEADER_COLUMNS}`,
        [...extraParams, id, companyId],
      );

      await client.query('COMMIT');
      return this._toOrder(updated.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async start(id: string, companyId: string, actorId: string | null): Promise<ProductionOrder> {
    return this._transition(id, companyId, 'IN_PROGRESS', 'started_by = $1, started_at = NOW(),', [
      actorId,
    ]);
  }

  async recordYield(
    id: string,
    companyId: string,
    data: RecordYieldData,
  ): Promise<ProductionOrder> {
    return this._transition(
      id,
      companyId,
      'YIELD_COMPLETED',
      'actual_qty = $1, waste_qty = $2, result_expired_date = $3, notes = COALESCE($4, notes), yield_at = NOW(),',
      [data.actualQty, data.wasteQty, data.resultExpiredDate, data.notes],
    );
  }

  async qaPass(
    id: string,
    companyId: string,
    qaNotes: string | null,
    actorId: string | null,
  ): Promise<ProductionOrder> {
    return this._transition(
      id,
      companyId,
      'QA_PASSED',
      'qa_notes = $1, qa_at = NOW(), completed_by = $2,',
      [qaNotes, actorId],
    );
  }

  async qaFail(
    id: string,
    companyId: string,
    qaNotes: string | null,
    actorId: string | null,
  ): Promise<ProductionOrder> {
    return this._transition(
      id,
      companyId,
      'QA_FAILED',
      'qa_notes = $1, qa_at = NOW(), completed_by = $2,',
      [qaNotes, actorId],
    );
  }

  async cancel(
    id: string,
    companyId: string,
    reason: string | null,
    actorId: string | null,
  ): Promise<ProductionOrder> {
    return this._transition(
      id,
      companyId,
      'CANCELLED',
      'qa_notes = COALESCE($1, qa_notes), cancelled_at = NOW(), completed_by = $2,',
      [reason, actorId],
    );
  }

  // ── Completion (backflushing, atomic) ─────────────────────────────────────

  async complete(id: string, companyId: string, actorId: string | null): Promise<ProductionOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // Lock the production order header
      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM production_orders
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PRODUCTION_ORDER.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      const fromStatus = header.status as ProductionStatus;
      if (!canTransition(fromStatus, 'COMPLETED')) {
        throw new InvariantError('PRODUCTION_ORDER.INVALID_STATUS_TRANSITION');
      }

      const qaPassed = fromStatus === 'QA_PASSED';
      const scaleFactor = Number(header.scale_factor);
      const outletId = header.outlet_id;
      const businessDate = header.production_date
        ? new Date(header.production_date)
        : new Date();
      const bizDate = businessDate.toISOString().slice(0, 10);

      // Load recipe ingredient lines for backflushing
      const itemsResult = await client.query<RecipeItemRow>(
        `SELECT id, ingredient_product_id, qty, loss_percentage
         FROM recipe_items WHERE recipe_id = $1`,
        [header.recipe_id],
      );

      // Consume each ingredient FEFO. Quantity = base * scale * (1 + loss/100).
      for (const item of itemsResult.rows) {
        const baseQty = Number(item.qty);
        const loss = Number(item.loss_percentage);
        const requiredQty = baseQty * scaleFactor * (1 + loss / 100);
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
              id,
              item.id,
              batch.id,
              actorId,
            ],
          );

          // Snapshot the consumption for audit/reconciliation
          await client.query(
            `INSERT INTO production_order_materials
               (production_order_id, recipe_item_id, product_id, batch_id, planned_qty, qty_consumed)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, item.id, item.ingredient_product_id, batch.id, requiredQty, take],
          );

          remaining -= take;
        }

        if (remaining > 1e-9) {
          // Negative-stock ban (rule #2): not enough ingredient to complete.
          throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
        }
      }

      let resultBatchId: string | null = null;

      // On QA pass, materialise finished goods as a new batch (PRODUCTION_RESULT).
      // On QA fail, ingredients are consumed but the output is scrapped (no batch).
      if (qaPassed) {
        const producedQty = header.actual_qty === null ? 0 : Number(header.actual_qty);
        if (!(producedQty > 0)) {
          throw new InvariantError('PRODUCTION_ORDER.NO_YIELD_RECORDED');
        }
        if (!header.result_expired_date) {
          throw new InvariantError('PRODUCTION_ORDER.RESULT_EXPIRY_REQUIRED');
        }
        const resultExpiry = new Date(header.result_expired_date).toISOString().slice(0, 10);

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
          [companyId, outletId, resultBatchId, header.product_id, producedQty, id, actorId],
        );

        await client.query(
          `INSERT INTO production_order_results
             (production_order_id, product_id, batch_id, batch_number, expired_date, qty_produced)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, header.product_id, resultBatchId, finishedBatchNumber, resultExpiry, producedQty],
        );
      }

      // Flip status to COMPLETED and record the finished batch link
      const updated = await client.query<HeaderRow>(
        `UPDATE production_orders
         SET status = 'COMPLETED', result_batch_id = $1, completed_by = $2, completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $3 AND company_id = $4
         RETURNING ${HEADER_COLUMNS}`,
        [resultBatchId, actorId, id, companyId],
      );

      const materials = await this._loadMaterials(client, id);
      const results = await this._loadResults(client, id);

      await client.query('COMMIT');
      return this._toOrder(updated.rows[0], materials, results);
    } catch (err) {
      await client.query('ROLLBACK');
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        throw new InvariantError('INVENTORY.DUPLICATE_MOVEMENT_SOURCE');
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
