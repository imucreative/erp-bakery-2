import { StockTransfer } from './entities/StockTransfer';
import { CreateStockTransferItemInput } from './entities/CreateStockTransfer';

export interface NewStockTransferData {
  sourceOutletId: string;
  destinationOutletId: string;
  transferDate: string | null;
  notes: string | null;
  items: CreateStockTransferItemInput[];
}

export interface StockTransferListFilter {
  limit: number;
  offset: number;
  sourceOutletId?: string;
  destinationOutletId?: string;
  status?: string;
  search?: string;
}

export interface StockTransferListResult {
  rows: StockTransfer[];
  total: number;
}

/**
 * Abstract repository — Stock Transfer domain. Company-scoped.
 *
 * dispatch() and receive() mutate stock and must do so atomically with the
 * status flip inside a serializable transaction (rules #16-#18).
 */
export abstract class StockTransferRepository {
  /** Create a DRAFT transfer + items (snapshots batch identity from source). */
  abstract createDraft(
    companyId: string,
    userId: string | null,
    data: NewStockTransferData,
  ): Promise<StockTransfer>;

  /** Replace a DRAFT transfer. Throws if not DRAFT. */
  abstract updateDraft(
    id: string,
    companyId: string,
    data: NewStockTransferData,
  ): Promise<StockTransfer>;

  abstract getById(id: string, companyId: string): Promise<StockTransfer>;

  abstract list(
    companyId: string,
    filter: StockTransferListFilter,
  ): Promise<StockTransferListResult>;

  /** DRAFT -> SUBMITTED (lock, no stock movement). */
  abstract submit(id: string, companyId: string, userId: string | null): Promise<StockTransfer>;

  /** DRAFT|SUBMITTED -> CANCELLED (no stock movement). */
  abstract cancel(id: string, companyId: string, userId: string | null): Promise<StockTransfer>;

  /**
   * SUBMITTED -> IN_TRANSIT. Within one serializable transaction: reload each
   * source batch FOR UPDATE, enforce negative-stock ban, decrement source
   * balance, append TRANSFER_OUT ledger rows, flip status (rules #16-#18).
   */
  abstract dispatch(id: string, companyId: string, userId: string | null): Promise<StockTransfer>;

  /**
   * IN_TRANSIT -> COMPLETED. Within one serializable transaction: for each
   * line resolve the destination batch by (destinationOutlet + product +
   * batchNumber + lotKey) or create it, increment its balance, append
   * TRANSFER_IN ledger rows, persist destination_batch_id, flip status.
   * Global stock is preserved: source decrease == destination increase.
   */
  abstract receive(id: string, companyId: string, userId: string | null): Promise<StockTransfer>;
}
