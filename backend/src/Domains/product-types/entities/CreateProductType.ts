const CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,49}$/;

/**
 * Domain Entity: CreateProductType
 *
 * Validates and normalises a new product-type reference row. `code` is the
 * stable identifier stored on products; it is upper-cased and immutable after
 * creation. Uniqueness is enforced by the repository/DB.
 */
export class CreateProductType {
  public readonly code: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly sortOrder: number;
  public readonly isActive: boolean;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.code = (p.code as string).trim().toUpperCase();
    this.name = (p.name as string).trim();
    this.description = this._normalizeDescription(p.description);
    this.sortOrder = p.sortOrder === undefined || p.sortOrder === null ? 0 : (p.sortOrder as number);
    this.isActive = p.isActive === undefined ? true : Boolean(p.isActive);
  }

  private _normalizeDescription(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = (value as string).trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.code || !p.name) {
      throw new Error('CREATE_PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (typeof p.code !== 'string' || typeof p.name !== 'string') {
      throw new Error('CREATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    const code = p.code.trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      throw new Error('CREATE_PRODUCT_TYPE.CODE_INVALID');
    }

    const name = p.name.trim();
    if (name.length === 0 || name.length > 100) {
      throw new Error('CREATE_PRODUCT_TYPE.NAME_LIMIT_CHAR');
    }

    if (
      p.description !== undefined &&
      p.description !== null &&
      typeof p.description !== 'string'
    ) {
      throw new Error('CREATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.description && (p.description as string).trim().length > 500) {
      throw new Error('CREATE_PRODUCT_TYPE.DESCRIPTION_LIMIT_CHAR');
    }

    if (p.sortOrder !== undefined && p.sortOrder !== null) {
      if (
        typeof p.sortOrder !== 'number' ||
        !Number.isInteger(p.sortOrder) ||
        p.sortOrder < 0
      ) {
        throw new Error('CREATE_PRODUCT_TYPE.SORT_ORDER_INVALID');
      }
    }

    if (
      p.isActive !== undefined &&
      p.isActive !== null &&
      typeof p.isActive !== 'boolean'
    ) {
      throw new Error('CREATE_PRODUCT_TYPE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
