/**
 * Domain Entity: UpdateProductType
 *
 * Partial update for a product type. `code` is immutable (it is the identifier
 * referenced by `products.product_type`); the controller path supplies it.
 */
export interface UpdateProductTypeFields {
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export class UpdateProductType {
  public readonly fields: UpdateProductTypeFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    const fields: UpdateProductTypeFields = {};

    if (p.name !== undefined) {
      fields.name = (p.name as string).trim();
    }
    if (p.description !== undefined) {
      const trimmed = p.description === null ? '' : (p.description as string).trim();
      fields.description = trimmed.length === 0 ? null : trimmed;
    }
    if (p.sortOrder !== undefined) {
      fields.sortOrder = p.sortOrder as number;
    }
    if (p.isActive !== undefined) {
      fields.isActive = p.isActive as boolean;
    }

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (
      p.name === undefined &&
      p.description === undefined &&
      p.sortOrder === undefined &&
      p.isActive === undefined
    ) {
      throw new Error('UPDATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (p.name !== undefined && typeof p.name !== 'string') {
      throw new Error('UPDATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.description !== undefined && p.description !== null && typeof p.description !== 'string') {
      throw new Error('UPDATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.sortOrder !== undefined && typeof p.sortOrder !== 'number') {
      throw new Error('UPDATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.isActive !== undefined && typeof p.isActive !== 'boolean') {
      throw new Error('UPDATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (p.name !== undefined) {
      const name = (p.name as string).trim();
      if (name.length === 0 || name.length > 100) {
        throw new Error('UPDATE_PRODUCT_TYPE.NAME_LIMIT_CHAR');
      }
    }
    if (p.description && (p.description as string).trim().length > 500) {
      throw new Error('UPDATE_PRODUCT_TYPE.DESCRIPTION_LIMIT_CHAR');
    }
    if (
      p.sortOrder !== undefined &&
      (!Number.isInteger(p.sortOrder) || (p.sortOrder as number) < 0)
    ) {
      throw new Error('UPDATE_PRODUCT_TYPE.SORT_ORDER_INVALID');
    }
  }
}
