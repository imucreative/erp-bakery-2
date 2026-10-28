import { Pool, PoolClient } from 'pg';
import {
  InventoryRepository,
  StockOnHandFilter,
  StockOnHandResult,
  StockOnHandRow,
  BatchListFilter,
  BatchListResult,
  LedgerFilter,
  LedgerResult,
  MovementDraft,
  FefoAllocation,
  InventoryDashboardSummary,
} from '../../Domains/inventory/InventoryRepository';
import { INVENTORY_EXPIRY_SOON_DAYS } from '../../Domains/inventory/batchStatus';
import { InventoryBatch } from '../../Domains/inventory/entities/InventoryBatch';
import { InventoryMovement } from '../../Domains/inventory/entities/InventoryMovement';
import { BatchStatus } from '../../Domains/inventory/batchStatus';
import { MovementType } from '../../Domains/inventory/movementTypes';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';
import {
  applyBalanceAndAppendMovement,
  resolveOrCreateBatch,
  translateDuplicateSourceKey,
} from './helpers/inventoryPosting';
import { toJakartaBusinessDate } from '../../Commons/helpers/businessDate';

interface BatchRow {
  id: string;
  company_id: string;
  outlet_id: string;
  product_id: string;
  batch_number: string;
  lot_key: string;
  lot_number: string | null;
  expired_date: Date | null;
  received_date: Date | null;
  qty_available: string;
  status: string;
  is_non_batch: boolean;
}

interface MovementRow {
  id: string;
  company_id: string;
  outlet_id: string;
  batch_id: string;
  product_id: string;
  movement_type: string;
  qty: string;
  before_qty: string;
  after_qty: string;
  source_document_type: string | null;
  source_document_id: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: Date;
}

// Anchor SQL DATE values at UTC midnight so pg cannot shift their calendar date with the host timezone.
const BATCH_COLUMNS = `id, company_id, outlet_id, product_id, batch_number, lot_key, lot_number, expired_date::timestamp AT TIME ZONE 'UTC' AS expired_date, received_date::timestamp AT TIME ZONE 'UTC' AS received_date, qty_available, status, is_non_batch`;
// Ledger timestamps are stored as UTC without a timezone; expose an unambiguous instant.
const MOVEMENT_COLUMNS = `id, company_id, outlet_id, batch_id, product_id, movement_type, qty, before_qty, after_qty, source_document_type, source_document_id, notes, user_id, created_at AT TIME ZONE 'UTC' AS created_at`;

/**
 * Concrete PostgreSQL implementation of InventoryRepository.
 * Raw SQL via pg — no ORM. Outlet-native, company-scoped.
 *
 * Mutations use an explicit transaction (BEGIN/COMMIT) with SERIALIZABLE
 * isolation and `SELECT ... FOR UPDATE` row locks so batch balance + ledger
 * append commit atomically without lost updates (inventory-domain rule #6).
 */
export class InventoryRepositoryPostgres extends InventoryRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toBatch(row: BatchRow): InventoryBatch {
    return new InventoryBatch({
      id: row.id,
      companyId: row.company_id,
      outletId: row.outlet_id,
      productId: row.product_id,
      batchNumber: row.batch_number,
      lotKey: row.lot_key,
      lotNumber: row.lot_number,
      expiredDate: row.expired_date,
      receivedDate: row.received_date,
      qtyAvailable: Number(row.qty_available),
      status: row.status as BatchStatus,
      isNonBatch: row.is_non_batch,
    });
  }

  private _toMovement(row: MovementRow): InventoryMovement {
    return new InventoryMovement({
      id: row.id,
      companyId: row.company_id,
      outletId: row.outlet_id,
      batchId: row.batch_id,
      productId: row.product_id,
      movementType: row.movement_type as MovementType,
      qty: Number(row.qty),
      beforeQty: Number(row.before_qty),
      afterQty: Number(row.after_qty),
      sourceDocumentType: row.source_document_type,
      sourceDocumentId: row.source_document_id,
      notes: row.notes,
      userId: row.user_id,
      createdAt: row.created_at,
    });
  }

  // ── Reads ──────────────────────────────────────────────────────────────

  async getStockOnHand(
    companyId: string,
    filter: StockOnHandFilter,
    businessDate: Date = new Date(),
  ): Promise<StockOnHandResult> {
    const bizDate = toJakartaBusinessDate(businessDate);
    const conditions: string[] = ['b.company_id = $1', "b.status = 'ACTIVE'"];
    const params: unknown[] = [companyId, bizDate];

    if (filter.outletId) {
      params.push(filter.outletId);
      conditions.push(`b.outlet_id = $${params.length}`);
    }
    if (filter.productId) {
      params.push(filter.productId);
      conditions.push(`b.product_id = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const sellableQtySql = `COALESCE(
      SUM(b.qty_available) FILTER (
        WHERE b.expired_date IS NULL OR b.expired_date >= $2::date
      ),
      0
    )`;
    const havingClause = filter.lowOnly
      ? `HAVING p.minimum_stock > 0 AND ${sellableQtySql} < p.minimum_stock`
      : '';

    const baseFrom = `
      FROM inventory_batches b
      JOIN products p ON p.id = b.product_id
      JOIN outlets o  ON o.id = b.outlet_id
      JOIN uoms u     ON u.id = p.uom_id
      WHERE ${whereClause}
      GROUP BY b.product_id, p.sku, p.name, p.minimum_stock, b.outlet_id, o.name, p.uom_id, u.code, u.name
      ${havingClause}
    `;

    // Total = number of product+outlet groups
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM (SELECT ${sellableQtySql} ${baseFrom}) AS grouped`,
      [...params],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<{
      product_id: string;
      product_sku: string;
      product_name: string;
      outlet_id: string;
      outlet_name: string;
      uom_id: string;
      uom_code: string;
      uom_name: string;
      qty_available: string;
      minimum_stock: string;
    }>(
      `SELECT
         b.product_id      AS product_id,
         p.sku             AS product_sku,
         p.name            AS product_name,
         b.outlet_id       AS outlet_id,
         o.name            AS outlet_name,
         p.uom_id          AS uom_id,
         u.code            AS uom_code,
         u.name            AS uom_name,
         ${sellableQtySql}  AS qty_available,
         p.minimum_stock   AS minimum_stock
       ${baseFrom}
       ORDER BY p.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const rows: StockOnHandRow[] = rowsResult.rows.map((r) => {
      const qty = Number(r.qty_available);
      const min = Number(r.minimum_stock);
      return {
        productId: r.product_id,
        productSku: r.product_sku,
        productName: r.product_name,
        outletId: r.outlet_id,
        outletName: r.outlet_name,
        uomId: r.uom_id,
        uomCode: r.uom_code,
        uomName: r.uom_name,
        qtyAvailable: qty,
        minimumStock: min,
        isLow: min > 0 && qty < min,
      };
    });

    return { rows, total };
  }

  async getLedger(companyId: string, filter: LedgerFilter): Promise<LedgerResult> {
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
    if (filter.batchId) {
      params.push(filter.batchId);
      conditions.push(`batch_id = $${params.length}`);
    }
    if (filter.movementType) {
      params.push(filter.movementType);
      conditions.push(`movement_type = $${params.length}`);
    }
    if (filter.dateFrom) {
      params.push(filter.dateFrom);
      conditions.push(`created_at >= $${params.length}::date::timestamp - INTERVAL '7 hours'`);
    }
    if (filter.dateTo) {
      params.push(filter.dateTo);
      conditions.push(`created_at < $${params.length}::date::timestamp + INTERVAL '1 day' - INTERVAL '7 hours'`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM inventory_movements WHERE ${whereClause}`,
      [...params],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<MovementRow>(
      `SELECT ${MOVEMENT_COLUMNS}
       FROM inventory_movements
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsResult.rows.map((r) => this._toMovement(r)), total };
  }

  async getBatches(
    companyId: string,
    filter: BatchListFilter,
    businessDate: Date = new Date(),
  ): Promise<BatchListResult> {
    const conditions: string[] = ['company_id = $1'];
    const params: unknown[] = [companyId];

    if (!filter.includeNonBatch) {
      conditions.push('is_non_batch = FALSE');
    }
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
    if (filter.operationalStatus) {
      params.push(toJakartaBusinessDate(businessDate), filter.operationalStatus);
      conditions.push(`(CASE
        WHEN status = 'ACTIVE' AND is_non_batch = FALSE
          AND expired_date < $${params.length - 1}::date THEN 'EXPIRED'
        ELSE status
      END) = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM inventory_batches WHERE ${whereClause}`,
      [...params],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<BatchRow>(
      `SELECT ${BATCH_COLUMNS}
       FROM inventory_batches
       WHERE ${whereClause}
       ORDER BY expired_date ASC NULLS LAST, created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsResult.rows.map((r) => this._toBatch(r)), total };
  }

  async getBatchById(id: string, companyId: string): Promise<InventoryBatch> {
    const result = await this.pool.query<BatchRow>(
      `SELECT ${BATCH_COLUMNS}
       FROM inventory_batches
       WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('INVENTORY_BATCH.NOT_FOUND');
    }

    return this._toBatch(result.rows[0]);
  }

  // ── FEFO ───────────────────────────────────────────────────────────────

  async planFefoAllocation(
    companyId: string,
    outletId: string,
    productId: string,
    qty: number,
    businessDate: Date,
  ): Promise<FefoAllocation[]> {
    // ACTIVE, non-expired, qty > 0, nearest expiry first (rule #1 / FEFO).
    // expired_date >= businessDate keeps same-day valid (rule #14).
    const bizDate = businessDate.toISOString().slice(0, 10);
    const result = await this.pool.query<BatchRow>(
      `SELECT ${BATCH_COLUMNS}
       FROM inventory_batches
       WHERE company_id = $1
         AND outlet_id = $2
         AND product_id = $3
         AND status = 'ACTIVE'
         AND qty_available > 0
         AND (expired_date IS NULL OR expired_date >= $4)
       ORDER BY expired_date ASC NULLS LAST, received_date ASC, created_at ASC`,
      [companyId, outletId, productId, bizDate],
    );

    const allocations: FefoAllocation[] = [];
    let remaining = qty;

    for (const row of result.rows) {
      if (remaining <= 0) break;
      const available = Number(row.qty_available);
      const take = Math.min(available, remaining);
      allocations.push({
        batchId: row.id,
        batchNumber: row.batch_number,
        lotKey: row.lot_key,
        expiredDate: row.expired_date,
        qty: take,
      });
      remaining -= take;
    }

    if (remaining > 0) {
      // Negative-stock ban (rule #2): cannot fulfil the requested quantity.
      throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
    }

    return allocations;
  }

  // ── Mutations (atomic) ───────────────────────────────────────────────────

  async postMovements(companyId: string, drafts: MovementDraft[]): Promise<InventoryMovement[]> {
    if (drafts.length === 0) return [];

    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      const created: InventoryMovement[] = [];

      for (const draft of drafts) {
        // Lock the target (existing) batch row for this company (rule #6).
        const batchResult = await client.query<BatchRow>(
          `SELECT ${BATCH_COLUMNS}
           FROM inventory_batches
           WHERE id = $1 AND company_id = $2
           FOR UPDATE`,
          [draft.batchId, companyId],
        );

        if (!batchResult.rowCount || batchResult.rowCount === 0) {
          throw new NotFoundError('INVENTORY_BATCH.NOT_FOUND');
        }

        const beforeQty = Number(batchResult.rows[0].qty_available);

        // Shared ledger primitive: negative-stock ban, balance update, immutable
        // ledger append with the source key (rules #2/#5/#6/#9). Same code path
        // as the Goods Receipt complete posting.
        const movementRow = await applyBalanceAndAppendMovement(
          client,
          {
            companyId,
            outletId: draft.outletId,
            batchId: draft.batchId,
            productId: draft.productId,
            movementType: draft.movementType,
            qty: draft.qty,
            sourceDocumentType: draft.sourceDocumentType,
            sourceDocumentId: draft.sourceDocumentId,
            sourceDocumentItemId: draft.sourceDocumentItemId,
            sourceDocumentAllocationId: draft.sourceDocumentAllocationId,
            notes: draft.notes,
            userId: draft.userId,
          },
          beforeQty,
        );

        created.push(this._toMovement(movementRow as MovementRow));
      }

      await client.query('COMMIT');
      return created;
    } catch (err) {
      await client.query('ROLLBACK');
      throw translateDuplicateSourceKey(err);
    } finally {
      client.release();
    }
  }

  // ── Dashboard (read-only aggregation) ────────────────────────────────────

  async getDashboardSummary(
    companyId: string,
    businessDate: Date,
    outletId?: string,
  ): Promise<InventoryDashboardSummary> {
    // Same WIB business day the batch list, stock-on-hand and POS availability use.
    const bizDate = toJakartaBusinessDate(businessDate);
    const soonBoundary = new Date(`${bizDate}T00:00:00.000Z`);
    soonBoundary.setUTCDate(soonBoundary.getUTCDate() + INVENTORY_EXPIRY_SOON_DAYS);
    const soonDate = soonBoundary.toISOString().slice(0, 10);

    // Optional outlet scope applied to batch-based metrics
    const outletFilter = outletId ? 'AND b.outlet_id = $2' : '';
    const batchParams: unknown[] = outletId ? [companyId, outletId] : [companyId];

    // Batch-based aggregates in a single pass
    const batchAgg = await this.pool.query<{
      total_active_batches: string;
      total_products: string;
      expiring_soon: string;
      expired: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE b.status = 'ACTIVE' AND b.qty_available > 0) AS total_active_batches,
         COUNT(DISTINCT b.product_id) FILTER (WHERE b.status = 'ACTIVE' AND b.qty_available > 0) AS total_products,
         COUNT(*) FILTER (
           WHERE b.status = 'ACTIVE' AND b.qty_available > 0
             AND b.expired_date IS NOT NULL
             AND b.expired_date >= $${outletId ? 3 : 2}::date
             AND b.expired_date <= $${outletId ? 4 : 3}::date
         ) AS expiring_soon,
         COUNT(*) FILTER (
           WHERE b.status = 'ACTIVE' AND b.qty_available > 0
             AND b.expired_date IS NOT NULL
             AND b.expired_date < $${outletId ? 3 : 2}::date
         ) AS expired
       FROM inventory_batches b
       WHERE b.company_id = $1 ${outletFilter}`,
      [...batchParams, bizDate, soonDate],
    );

    // Low stock: product+outlet groups whose summed active balance < minimum_stock
    const lowStock = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM (
         SELECT b.product_id, b.outlet_id
         FROM inventory_batches b
         JOIN products p ON p.id = b.product_id
         WHERE b.company_id = $1 AND b.status = 'ACTIVE' ${outletFilter}
           AND p.minimum_stock > 0
         GROUP BY b.product_id, b.outlet_id, p.minimum_stock
         HAVING SUM(b.qty_available) < p.minimum_stock
       ) AS low`,
      batchParams,
    );

    // In-transit transfers (outlet scope matches source OR destination)
    const transferParams: unknown[] = outletId ? [companyId, outletId] : [companyId];
    const inTransit = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM stock_transfers
       WHERE company_id = $1 AND status = 'IN_TRANSIT'
       ${outletId ? 'AND (source_outlet_id = $2 OR destination_outlet_id = $2)' : ''}`,
      transferParams,
    );

    const agg = batchAgg.rows[0];
    return {
      totalActiveBatches: parseInt(agg.total_active_batches, 10),
      totalProductsInStock: parseInt(agg.total_products, 10),
      lowStockCount: parseInt(lowStock.rows[0].count, 10),
      expiringSoonCount: parseInt(agg.expiring_soon, 10),
      expiredCount: parseInt(agg.expired, 10),
      inTransitTransfers: parseInt(inTransit.rows[0].count, 10),
    };
  }
}
