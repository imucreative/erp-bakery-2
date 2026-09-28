import { StockOpname } from './entities/StockOpname';

export interface StockOpnameListFilter {
  limit: number;
  offset: number;
  outletId?: string;
  status?: string;
  search?: string;
}

export interface StockOpnameListResult {
  rows: StockOpname[];
  total: number;
}

/**
 * Abstract repository — Stock Opname domain. Company-scoped.
 *
 * start() and complete() are the stock-affecting transitions:
 *  - start snapshots batch balances and asserts the outlet lock,
 *  - complete generates a reconciling Stock Adjustment when variance != 0.
 */
export abstract class StockOpnameRepository {
  /** Create a DRAFT opname header (no items yet). Generates OPN-YYYY-NNNNNN. */
  abstract createDraft(
    companyId: string,
    userId: string | null,
    data: { outletId: string; opnameDate: string | null; notes: string | null },
  ): Promise<StockOpname>;

  /**
   * DRAFT -> COUNTING. Within a serializable transaction: assert no other
   * active opname locks the outlet, snapshot every ACTIVE batch of the outlet
   * into stock_opname_items (system_qty), and flip status (rule #24).
   */
  abstract start(id: string, companyId: string, userId: string | null): Promise<StockOpname>;

  /** Record a physical count for one item (only while COUNTING). */
  abstract recordCount(
    id: string,
    itemId: string,
    companyId: string,
    countedQty: number,
  ): Promise<StockOpname>;

  /** COUNTING -> SUBMITTED (lock retained). */
  abstract submit(id: string, companyId: string, userId: string | null): Promise<StockOpname>;

  /** SUBMITTED -> APPROVED (lock retained). */
  abstract approve(id: string, companyId: string, userId: string | null): Promise<StockOpname>;

  /** DRAFT/COUNTING/SUBMITTED -> CANCELLED (releases lock). */
  abstract cancel(id: string, companyId: string, userId: string | null): Promise<StockOpname>;

  /**
   * APPROVED -> COMPLETED. Within one serializable transaction: for each item
   * with non-zero variance, reload the batch FOR UPDATE, apply the correction
   * to qty_available, append ADJUSTMENT_IN/OUT movements (rule #25 canonical
   * posting), create ONE generated Stock Adjustment (source_document_type =
   * STOCK_OPNAME) recording the corrections, flip status (releases lock).
   * Zero-variance completion creates no adjustment and no movement.
   */
  abstract complete(id: string, companyId: string, userId: string | null): Promise<StockOpname>;

  abstract getById(id: string, companyId: string): Promise<StockOpname>;

  abstract list(companyId: string, filter: StockOpnameListFilter): Promise<StockOpnameListResult>;
}
