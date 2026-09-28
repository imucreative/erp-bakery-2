/**
 * Domain Entity: CreateStockOpname
 *
 * Validates the payload to create an opname DRAFT. The item set (which batches
 * to count) is captured at COUNTING start via snapshot — create only needs the
 * target outlet + optional notes.
 */
export class CreateStockOpname {
  public readonly outletId: string;
  public readonly opnameDate: string | null;
  public readonly notes: string | null;

  constructor(payload: unknown) {
    this._verifyPayload(payload);
    const p = payload as Record<string, unknown>;
    this.outletId = (p.outletId as string).trim();
    this.opnameDate = p.opnameDate ? String(p.opnameDate) : null;
    this.notes = p.notes ? String(p.notes).trim() : null;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_STOCK_OPNAME.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;
    if (!p.outletId || typeof p.outletId !== 'string') {
      throw new Error('CREATE_STOCK_OPNAME.NOT_CONTAIN_NEEDED_PROPERTY');
    }
  }
}
