/**
 * Domain Entity: UpdatePaymentTerm
 *
 * Validates a partial-update payload. At least one updatable field must be present.
 * `code` is immutable after creation and is therefore NOT an updatable field.
 * `dueDays` (when present) must be a non-negative integer.
 */
export interface UpdatePaymentTermFields {
  name?: string;
  dueDays?: number;
  isActive?: boolean;
}

export class UpdatePaymentTerm {
  public readonly fields: UpdatePaymentTermFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { name, dueDays, isActive } = payload as Record<string, unknown>;
    const fields: UpdatePaymentTermFields = {};

    if (name !== undefined) fields.name = (name as string).trim();
    if (dueDays !== undefined) fields.dueDays = dueDays as number;
    if (isActive !== undefined) fields.isActive = Boolean(isActive);

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { name, dueDays, isActive } = payload as Record<string, unknown>;

    if (name === undefined && dueDays === undefined && isActive === undefined) {
      throw new Error('UPDATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (name !== undefined && typeof name !== 'string') {
      throw new Error('UPDATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (dueDays !== undefined && typeof dueDays !== 'number') {
      throw new Error('UPDATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      throw new Error('UPDATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (
      name !== undefined &&
      ((name as string).trim().length === 0 || (name as string).trim().length > 100)
    ) {
      throw new Error('UPDATE_PAYMENT_TERM.NAME_LIMIT_CHAR');
    }
    if (dueDays !== undefined && (!Number.isInteger(dueDays) || (dueDays as number) < 0)) {
      throw new Error('UPDATE_PAYMENT_TERM.DUE_DAYS_INVALID');
    }
  }
}
