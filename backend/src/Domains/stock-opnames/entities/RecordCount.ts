/**
 * Domain Entity: RecordCount
 * Validates recording a physical counted quantity for one opname item.
 */
export class RecordCount {
  public readonly countedQty: number;

  constructor(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('RECORD_COUNT.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;

    if (
      p.countedQty === undefined ||
      p.countedQty === null ||
      typeof p.countedQty !== 'number' ||
      !Number.isFinite(p.countedQty)
    ) {
      throw new Error('RECORD_COUNT.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.countedQty < 0) {
      throw new Error('RECORD_COUNT.QTY_MUST_BE_NON_NEGATIVE');
    }

    this.countedQty = p.countedQty;
  }
}
