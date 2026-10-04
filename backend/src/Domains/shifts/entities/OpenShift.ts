/**
 * Domain Entity: OpenShift
 *
 * Validates the payload to open a cashier shift (doc 51 §4.2):
 *  - outletId required (uuid-shaped string),
 *  - openingCash a finite number >= 0,
 *  - notes optional free text.
 */
export class OpenShift {
  public readonly outletId: string;
  public readonly openingCash: number;
  public readonly notes: string | null;

  constructor(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('OPEN_SHIFT.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;

    if (!p.outletId || typeof p.outletId !== 'string') {
      throw new Error('OPEN_SHIFT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (
      p.openingCash === undefined ||
      p.openingCash === null ||
      typeof p.openingCash !== 'number' ||
      !Number.isFinite(p.openingCash)
    ) {
      throw new Error('OPEN_SHIFT.CASH_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.openingCash < 0) {
      throw new Error('OPEN_SHIFT.CASH_MUST_BE_NON_NEGATIVE');
    }

    this.outletId = p.outletId.trim();
    this.openingCash = p.openingCash;
    this.notes = p.notes ? String(p.notes).trim() : null;
  }
}
