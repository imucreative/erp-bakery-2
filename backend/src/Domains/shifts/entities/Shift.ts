import { ShiftStatus } from '../shiftStatus';

/**
 * Domain Entity: Shift (read value object) — cashier shift header.
 *
 * expected_cash / actual_cash / discrepancy are null while OPEN; they are
 * populated at close (doc 51 §4.2).
 */
export class Shift {
  public readonly id: string;
  public readonly companyId: string;
  public readonly outletId: string;
  public readonly cashierUserId: string;
  public readonly openedAt: Date;
  public readonly closedAt: Date | null;
  public readonly openingCash: number;
  public readonly expectedCash: number | null;
  public readonly actualCash: number | null;
  public readonly discrepancy: number | null;
  public readonly status: ShiftStatus;
  public readonly notes: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    outletId: string;
    cashierUserId: string;
    openedAt: Date;
    closedAt: Date | null;
    openingCash: number;
    expectedCash: number | null;
    actualCash: number | null;
    discrepancy: number | null;
    status: ShiftStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.outletId = payload.outletId;
    this.cashierUserId = payload.cashierUserId;
    this.openedAt = payload.openedAt;
    this.closedAt = payload.closedAt;
    this.openingCash = payload.openingCash;
    this.expectedCash = payload.expectedCash;
    this.actualCash = payload.actualCash;
    this.discrepancy = payload.discrepancy;
    this.status = payload.status;
    this.notes = payload.notes;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
