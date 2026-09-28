import { StockAdjustment } from './entities/StockAdjustment';
import { CreateStockAdjustmentItemInput } from './entities/CreateStockAdjustment';
import { AdjustmentStatus } from './adjustmentStatus';

export interface NewStockAdjustmentData {
  outletId: string;
  adjustmentDate: string | null;
  notes: string | null;
  items: CreateStockAdjustmentItemInput[];
}

export interface StockAdjustmentListFilter {
  limit: number;
  offset: number;
  outletId?: string;
  status?: string;
  search?: string;
}

export interface StockAdjustmentListResult {
  rows: StockAdjustment[];
  total: number;
}

/**
 * Abstract repository — Stock Adjustment domain. Company-scoped.
 *
 * Draft CRUD + lifecycle transitions. The completion transition is the only
 * one that mutates stock, and it must do so atomically with the inventory
 * ledger (delegated to the concrete implementation using the same DB
 * transaction as the status flip).
 */
export abstract class StockAdjustmentRepository {
  /** Create a DRAFT adjustment + its items. Generates ADJ-YYYY-NNNNNN. */
  abstract createDraft(
    companyId: string,
    userId: string | null,
    data: NewStockAdjustmentData,
  ): Promise<StockAdjustment>;

  /** Replace notes/date/items of a DRAFT. Throws if not DRAFT. */
  abstract updateDraft(
    id: string,
    companyId: string,
    data: NewStockAdjustmentData,
  ): Promise<StockAdjustment>;

  abstract getById(id: string, companyId: string): Promise<StockAdjustment>;

  abstract list(
    companyId: string,
    filter: StockAdjustmentListFilter,
  ): Promise<StockAdjustmentListResult>;

  /**
   * Flip status for a non-completing transition (submit/approve/cancel).
   * Sets the matching actor + timestamp column. Does NOT mutate stock.
   * Throws STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION if not allowed.
   */
  abstract changeStatus(
    id: string,
    companyId: string,
    userId: string | null,
    to: Exclude<AdjustmentStatus, 'COMPLETED'>,
  ): Promise<StockAdjustment>;

  /**
   * Complete an APPROVED adjustment: within a single serializable transaction,
   * reload each target batch FOR UPDATE, derive authoritative before/after,
   * mutate inventory_batches, append ADJUSTMENT_IN/OUT ledger rows, persist
   * item before/after snapshots, and flip status to COMPLETED (rule #20).
   * Throws STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION if not APPROVED, and
   * INVENTORY.INSUFFICIENT_STOCK if an OUT line would go negative (rule #21).
   */
  abstract complete(
    id: string,
    companyId: string,
    userId: string | null,
  ): Promise<StockAdjustment>;
}
