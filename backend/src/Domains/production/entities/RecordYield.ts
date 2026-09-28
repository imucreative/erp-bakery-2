/**
 * Domain Entity: RecordYield
 *
 * Validates the payload for recording the actual output of an IN_PROGRESS
 * production order, transitioning it to YIELD_COMPLETED (production-domain §5).
 *
 * - actualQty: finished goods actually produced (>= 0). May differ from the
 *   scheduled quantity (over/under yield).
 * - wasteQty: quantity lost/scrapped during production (>= 0), informational.
 * - resultExpiredDate: required expiry for the finished-goods batch that will
 *   be created on completion (inventory-domain rule #10 — stock needs expiry).
 */
export class RecordYield {
  public readonly actualQty: number;
  public readonly wasteQty: number;
  public readonly resultExpiredDate: string;
  public readonly notes: string | null;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.actualQty = Number(p.actualQty);
    this.wasteQty = p.wasteQty === undefined || p.wasteQty === null ? 0 : Number(p.wasteQty);
    this.resultExpiredDate = (p.resultExpiredDate as string).trim();
    this.notes = p.notes ? String(p.notes).trim() : null;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('RECORD_YIELD.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;

    if (
      p.actualQty === undefined ||
      p.actualQty === null ||
      typeof p.actualQty !== 'number' ||
      !Number.isFinite(p.actualQty)
    ) {
      throw new Error('RECORD_YIELD.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.actualQty <= 0) {
      throw new Error('RECORD_YIELD.QTY_MUST_BE_POSITIVE');
    }

    if (p.wasteQty !== undefined && p.wasteQty !== null) {
      if (typeof p.wasteQty !== 'number' || !Number.isFinite(p.wasteQty) || p.wasteQty < 0) {
        throw new Error('RECORD_YIELD.WASTE_INVALID');
      }
    }

    if (!p.resultExpiredDate || typeof p.resultExpiredDate !== 'string') {
      throw new Error('RECORD_YIELD.RESULT_EXPIRY_REQUIRED');
    }
    if (Number.isNaN(Date.parse(p.resultExpiredDate))) {
      throw new Error('RECORD_YIELD.RESULT_EXPIRY_INVALID');
    }
  }
}
