import { InventoryBatch } from './entities/InventoryBatch';
import { InventoryMovement } from './entities/InventoryMovement';
import { MovementType } from './movementTypes';

export interface StockOnHandRow {
  productId: string;
  productSku: string;
  productName: string;
  outletId: string;
  outletName: string;
  qtyAvailable: number; // summed across active batches
  minimumStock: number;
  isLow: boolean; // qtyAvailable < minimumStock (only when minimumStock > 0)
}

export interface StockOnHandFilter {
  limit: number;
  offset: number;
  outletId?: string;
  productId?: string;
  search?: string;
  lowOnly?: boolean;
}

export interface StockOnHandResult {
  rows: StockOnHandRow[];
  total: number;
}

export interface BatchListFilter {
  limit: number;
  offset: number;
  outletId?: string;
  productId?: string;
  status?: string;
  includeNonBatch?: boolean;
}

export interface BatchListResult {
  rows: InventoryBatch[];
  total: number;
}

export interface LedgerFilter {
  limit: number;
  offset: number;
  outletId?: string;
  productId?: string;
  batchId?: string;
  movementType?: string;
}

export interface LedgerResult {
  rows: InventoryMovement[];
  total: number;
}

/**
 * A single ledger-append instruction executed atomically with a batch balance
 * change. Used by transactional services (adjustment/transfer/opname/etc.).
 */
export interface MovementDraft {
  outletId: string;
  batchId: string;
  productId: string;
  movementType: MovementType;
  qty: number; // positive magnitude
  sourceDocumentType?: string | null;
  sourceDocumentId?: string | null;
  sourceDocumentItemId?: string | null;
  sourceDocumentAllocationId?: string | null;
  notes?: string | null;
  userId?: string | null;
}

/**
 * A FEFO allocation slice: which batch to draw from and how much.
 */
export interface FefoAllocation {
  batchId: string;
  batchNumber: string;
  lotKey: string;
  expiredDate: Date | null;
  qty: number;
}

export interface InventoryDashboardSummary {
  totalActiveBatches: number;
  totalProductsInStock: number; // distinct products with active stock
  lowStockCount: number; // product+outlet groups below minimum_stock
  expiringSoonCount: number; // active batches expiring within threshold
  expiredCount: number; // active batches already expired (still on hand)
  inTransitTransfers: number; // stock_transfers currently IN_TRANSIT
}

/**
 * Abstract repository — Inventory domain (outlet-native, no warehouse layer).
 * All reads/writes are company-scoped for SaaS tenant isolation.
 *
 * Mutating operations MUST commit the batch balance change and the ledger
 * append atomically within a concurrency-safe transaction (domain rule #6).
 */
export abstract class InventoryRepository {
  // ── Reads ──────────────────────────────────────────────────────────────
  /** Stock-On-Hand aggregated per product+outlet from batch balances (rule #8). */
  abstract getStockOnHand(companyId: string, filter: StockOnHandFilter): Promise<StockOnHandResult>;

  /** Immutable ledger listing (rule #9). */
  abstract getLedger(companyId: string, filter: LedgerFilter): Promise<LedgerResult>;

  /** Batch & Expiry monitoring listing over inventory_batches (rule #14). */
  abstract getBatches(companyId: string, filter: BatchListFilter): Promise<BatchListResult>;

  /** Fetch a single batch scoped to company. Throws INVENTORY_BATCH.NOT_FOUND. */
  abstract getBatchById(id: string, companyId: string): Promise<InventoryBatch>;

  // ── FEFO ───────────────────────────────────────────────────────────────
  /**
   * Compute a FEFO allocation plan for consuming `qty` of a product at an outlet:
   * ACTIVE batches, qty > 0, not expired, ordered by nearest expiry first
   * (inventory-domain rules #1 & FEFO). Read-only planning — does not mutate.
   * Throws INVENTORY.INSUFFICIENT_STOCK if available stock < requested qty.
   */
  abstract planFefoAllocation(
    companyId: string,
    outletId: string,
    productId: string,
    qty: number,
    businessDate: Date,
  ): Promise<FefoAllocation[]>;

  // ── Mutations (atomic) ───────────────────────────────────────────────────
  /**
   * Apply a set of movement drafts atomically. For each draft:
   *  - reload the target batch balance under a concurrency-safe lock,
   *  - derive authoritative before/after qty,
   *  - enforce the negative-stock ban (rule #2),
   *  - update inventory_batches.qty_available,
   *  - append an inventory_movements row.
   * All drafts commit together or none do. Returns the created movements.
   * Duplicate source keys are rejected by the DB idempotency index (rule #5).
   */
  abstract postMovements(companyId: string, drafts: MovementDraft[]): Promise<InventoryMovement[]>;

  // Goods Receipt posting lives in GoodsReceiptRepository.complete so the GR
  // status flip + status log + inventory posting commit in ONE transaction
  // (atomic complete). It reuses the shared ledger helpers in
  // Infrastructures/repository/helpers/inventoryPosting.ts, so the ledger write
  // path is identical to postMovements.

  // ── Dashboard (read-only aggregation) ────────────────────────────────────
  /**
   * Aggregate read-only inventory metrics for the dashboard (rule #26).
   * Optionally scoped to a single outlet. `businessDate` drives expiry buckets.
   */
  abstract getDashboardSummary(
    companyId: string,
    businessDate: Date,
    outletId?: string,
  ): Promise<InventoryDashboardSummary>;
}
