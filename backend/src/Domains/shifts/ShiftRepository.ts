import { Shift } from './entities/Shift';

export interface ShiftListFilter {
  limit: number;
  offset: number;
  outletId?: string;
  cashierUserId?: string;
  status?: string;
}

export interface ShiftListResult {
  rows: Shift[];
  total: number;
}

/**
 * Abstract repository — Shift domain (POS / Sales Fase 1). Company-scoped.
 *
 * openShift relies on the partial unique index (one OPEN per cashier+outlet)
 * for the race-safe guard. closeShift is the OPEN -> CLOSED transition that
 * derives expected_cash / discrepancy (doc 51 §4.2).
 */
export abstract class ShiftRepository {
  /**
   * Open a shift (status OPEN). Relies on the partial unique index to reject a
   * second OPEN shift for the same (cashier, outlet) — a 23505 is translated to
   * SHIFT.ALREADY_OPEN.
   */
  abstract openShift(
    companyId: string,
    cashierUserId: string | null,
    data: { outletId: string; openingCash: number; notes: string | null },
  ): Promise<Shift>;

  /**
   * Close a shift (OPEN -> CLOSED). Within a transaction: lock the row FOR
   * UPDATE, assert status OPEN, compute expected_cash (Fase 1 = opening_cash)
   * and discrepancy (= actual_cash - expected_cash), persist the close.
   */
  abstract closeShift(
    id: string,
    companyId: string,
    userId: string | null,
    data: { actualCash: number; notes: string | null },
  ): Promise<Shift>;

  abstract getById(id: string, companyId: string): Promise<Shift>;

  abstract list(companyId: string, filter: ShiftListFilter): Promise<ShiftListResult>;
}
