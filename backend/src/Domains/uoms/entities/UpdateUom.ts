/**
 * Domain Entity: UpdateUom
 *
 * Validates a partial-update payload. At least one updatable field must be present.
 */
export interface UpdateUomFields {
  name?: string;
  isActive?: boolean;
}

export class UpdateUom {
  public readonly fields: UpdateUomFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { name, isActive } = payload as Record<string, unknown>;
    const fields: UpdateUomFields = {};

    if (name !== undefined) fields.name = (name as string).trim();
    if (isActive !== undefined) fields.isActive = Boolean(isActive);

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { name, isActive } = payload as Record<string, unknown>;

    if (name === undefined && isActive === undefined) {
      throw new Error('UPDATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (name !== undefined && typeof name !== 'string') {
      throw new Error('UPDATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      throw new Error('UPDATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (
      name !== undefined &&
      ((name as string).trim().length === 0 || (name as string).trim().length > 100)
    ) {
      throw new Error('UPDATE_UOM.NAME_LIMIT_CHAR');
    }
  }
}
