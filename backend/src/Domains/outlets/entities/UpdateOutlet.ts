/**
 * Domain Entity: UpdateOutlet
 *
 * Validates a partial-update payload. At least one updatable field must be
 * present. Only the fields the client sent are returned so the use case can
 * build a targeted UPDATE statement.
 */
export interface UpdateOutletFields {
  name?: string;
  address?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

export class UpdateOutlet {
  public readonly fields: UpdateOutletFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { name, address, phone, isActive } = payload as Record<string, unknown>;
    const fields: UpdateOutletFields = {};

    if (name !== undefined) fields.name = (name as string).trim();
    if (address !== undefined) fields.address = address === null ? null : (address as string).trim();
    if (phone !== undefined) fields.phone = phone === null ? null : (phone as string).trim();
    if (isActive !== undefined) fields.isActive = Boolean(isActive);

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { name, address, phone, isActive } = payload as Record<string, unknown>;

    if (
      name === undefined &&
      address === undefined &&
      phone === undefined &&
      isActive === undefined
    ) {
      throw new Error('UPDATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (name !== undefined && typeof name !== 'string') {
      throw new Error('UPDATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (address !== undefined && address !== null && typeof address !== 'string') {
      throw new Error('UPDATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      throw new Error('UPDATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      throw new Error('UPDATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (name !== undefined && ((name as string).trim().length === 0 || (name as string).trim().length > 100)) {
      throw new Error('UPDATE_OUTLET.NAME_LIMIT_CHAR');
    }
    if (phone && (phone as string).trim().length > 30) {
      throw new Error('UPDATE_OUTLET.PHONE_LIMIT_CHAR');
    }
  }
}
