/**
 * Domain Entity: UpdateUomDimension
 *
 * Partial update for a dimension. Code and canonical unit are immutable: a
 * changed anchor would silently invalidate every stored factor, GR snapshot,
 * and stock quantity.
 */
export interface UpdateUomDimensionFields {
  name?: string;
  isActive?: boolean;
}

const UPDATABLE_KEYS: (keyof UpdateUomDimensionFields)[] = ['name', 'isActive'];

export class UpdateUomDimension {
  public readonly fields: UpdateUomDimensionFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { name, isActive } = payload as Record<string, unknown>;
    const fields: UpdateUomDimensionFields = {};

    if (name !== undefined) fields.name = (name as string).trim();
    if (isActive !== undefined) fields.isActive = Boolean(isActive);

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_UOM_DIMENSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { name, isActive } = payload as Record<string, unknown>;

    if (UPDATABLE_KEYS.every((key) => (payload as Record<string, unknown>)[key] === undefined)) {
      throw new Error('UPDATE_UOM_DIMENSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (name !== undefined) {
      if (typeof name !== 'string') {
        throw new Error('UPDATE_UOM_DIMENSION.NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      const trimmed = name.trim();
      if (trimmed.length === 0 || trimmed.length > 100) {
        throw new Error('UPDATE_UOM_DIMENSION.NAME_LIMIT_CHAR');
      }
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      throw new Error('UPDATE_UOM_DIMENSION.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
