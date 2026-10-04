/**
 * Domain Entity: CloseShift
 *
 * Validates the payload to close a cashier shift (doc 51 §4.2):
 *  - actualCash a finite number >= 0 (physical drawer count),
 *  - notes optional free text.
 *
 * expected_cash & discrepancy are derived in the repository, not here.
 */
export class CloseShift {
  public readonly actualCash: number;
  public readonly notes: string | null;

  constructor(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CLOSE_SHIFT.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;

    if (
      p.actualCash === undefined ||
      p.actualCash === null ||
      typeof p.actualCash !== 'number' ||
      !Number.isFinite(p.actualCash)
    ) {
      throw new Error('CLOSE_SHIFT.CASH_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.actualCash < 0) {
      throw new Error('CLOSE_SHIFT.CASH_MUST_BE_NON_NEGATIVE');
    }

    this.actualCash = p.actualCash;
    this.notes = p.notes ? String(p.notes).trim() : null;
  }
}
