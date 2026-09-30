/**
 * Domain Entity: CreatePaymentTerm
 *
 * Validates & normalises the payload for creating a payment term.
 * Unlike Supplier/UOM, the `code` is USER-supplied; it is normalised via
 * trim + uppercase and must be unique per company (enforced in the use case).
 * `dueDays` must be a non-negative integer.
 */
export class CreatePaymentTerm {
  public readonly code: string;
  public readonly name: string;
  public readonly dueDays: number;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { code, name, dueDays } = payload as Record<string, unknown>;

    this.code = (code as string).trim().toUpperCase();
    this.name = (name as string).trim();
    this.dueDays = dueDays as number;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { code, name, dueDays } = payload as Record<string, unknown>;

    if (!code || !name || dueDays === undefined || dueDays === null) {
      throw new Error('CREATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (typeof code !== 'string' || typeof name !== 'string' || typeof dueDays !== 'number') {
      throw new Error('CREATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if ((code as string).trim().length === 0 || (code as string).trim().length > 20) {
      throw new Error('CREATE_PAYMENT_TERM.CODE_LIMIT_CHAR');
    }
    if ((name as string).trim().length === 0 || (name as string).trim().length > 100) {
      throw new Error('CREATE_PAYMENT_TERM.NAME_LIMIT_CHAR');
    }
    if (!Number.isInteger(dueDays) || (dueDays as number) < 0) {
      throw new Error('CREATE_PAYMENT_TERM.DUE_DAYS_INVALID');
    }
  }
}
