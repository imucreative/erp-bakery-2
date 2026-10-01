import { GoodsReceipt } from './entities/GoodsReceipt';
import { ResolvedGoodsReceiptItem } from './entities/CreateGoodsReceipt';

/**
 * Fully resolved GR data passed from the use case to the repository. supplierId
 * and destinationOutletId are snapshots the use case inherited from the source
 * PO; ordered quantities on items are PO-line snapshots. The repository only
 * persists them.
 */
export interface NewGoodsReceiptData {
  purchaseOrderId: string;
  supplierId: string;
  destinationOutletId: string;
  receiveDate: string;
  items: ResolvedGoodsReceiptItem[];
  notes: string | null;
}

export interface GoodsReceiptListFilter {
  limit: number;
  offset: number;
  status?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  destinationOutletId?: string;
  search?: string;
}

export interface GoodsReceiptListResult {
  rows: GoodsReceipt[];
  total: number;
}

/**
 * Abstract repository — Goods Receipt domain. Company-scoped.
 *
 * Every status-changing method appends a goods_receipt_status_logs row in the
 * same transaction as the header update, so the approval timeline can never
 * drift from the document state. Numbering is generated race-safely inside
 * createDraft (GR-YYYY-NNNNNN, per company, per year — no outlet code).
 *
 * Stage 1 scope: createDraft, updateDraft, getById, list, cancel, plus the
 * cross-document consumption query used for outstanding. The complete action
 * (DRAFT -> COMPLETED with inventory posting) is intentionally NOT part of this
 * repository yet; it arrives in Stage 2.
 */
export abstract class GoodsReceiptRepository {
  /** Create a DRAFT GR + items, generate gr_number, log (null -> DRAFT). */
  abstract createDraft(
    companyId: string,
    userId: string | null,
    data: NewGoodsReceiptData,
  ): Promise<GoodsReceipt>;

  /**
   * Replace an editable (DRAFT) GR header + items. Throws when the GR is not in
   * an editable status.
   */
  abstract updateDraft(
    id: string,
    companyId: string,
    userId: string | null,
    data: NewGoodsReceiptData,
  ): Promise<GoodsReceipt>;

  abstract getById(id: string, companyId: string): Promise<GoodsReceipt>;

  abstract list(
    companyId: string,
    filter: GoodsReceiptListFilter,
  ): Promise<GoodsReceiptListResult>;

  /**
   * Sum the received quantity (accepted + rejected) per PO line consumed by
   * CONSUMING GRs of the given PO (status in DRAFT, COMPLETED), company-scoped.
   * CANCELLED GRs are excluded (their consumption returns to the PO). When
   * `excludeGoodsReceiptId` is provided (edit mode), that GR's own consumption
   * is left out so it is not double-counted against itself.
   *
   * Returns a Map keyed by purchase_order_items.id; PO lines with no consumption
   * are absent (the caller treats a missing key as 0).
   */
  abstract getConsumedQtyByPoItem(
    purchaseOrderId: string,
    companyId: string,
    excludeGoodsReceiptId?: string,
  ): Promise<Map<string, number>>;

  /** DRAFT -> CANCELLED (soft-delete + terminal status). */
  abstract cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<GoodsReceipt>;
}
