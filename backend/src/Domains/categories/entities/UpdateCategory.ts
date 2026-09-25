/**
 * Domain Entity: UpdateCategory
 *
 * Validates a partial-update payload. At least one updatable field must be present.
 * The product group is immutable after creation (products reference the
 * category/group pair), so it is intentionally not updatable here.
 */
export interface UpdateCategoryFields {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export class UpdateCategory {
  public readonly fields: UpdateCategoryFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { name, description, isActive } = payload as Record<string, unknown>;
    const fields: UpdateCategoryFields = {};

    if (name !== undefined) fields.name = (name as string).trim();
    if (description !== undefined) {
      fields.description = description === null ? null : (description as string).trim();
    }
    if (isActive !== undefined) fields.isActive = Boolean(isActive);

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { name, description, isActive } = payload as Record<string, unknown>;

    if (name === undefined && description === undefined && isActive === undefined) {
      throw new Error('UPDATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (name !== undefined && typeof name !== 'string') {
      throw new Error('UPDATE_CATEGORY.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      throw new Error('UPDATE_CATEGORY.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      throw new Error('UPDATE_CATEGORY.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (
      name !== undefined &&
      ((name as string).trim().length === 0 || (name as string).trim().length > 100)
    ) {
      throw new Error('UPDATE_CATEGORY.NAME_LIMIT_CHAR');
    }
    if (description && (description as string).trim().length > 500) {
      throw new Error('UPDATE_CATEGORY.DESCRIPTION_LIMIT_CHAR');
    }
  }
}
