const CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,19}$/;

/**
 * Domain Entity: CreateUomDimension
 *
 * Validates a new global dimension definition. `code` is immutable and stored
 * on `uoms.dimension`; `canonicalUnitName/Symbol` describe the smallest unit
 * of the dimension (all other UOM factors must be >= 1 relative to it).
 */
export class CreateUomDimension {
  public readonly code: string;
  public readonly name: string;
  public readonly canonicalUnitName: string;
  public readonly canonicalUnitSymbol: string;
  public readonly isActive: boolean;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.code = (p.code as string).trim().toUpperCase();
    this.name = (p.name as string).trim();
    this.canonicalUnitName = (p.canonicalUnitName as string).trim();
    this.canonicalUnitSymbol = (p.canonicalUnitSymbol as string).trim();
    this.isActive = p.isActive === undefined ? true : Boolean(p.isActive);
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_UOM_DIMENSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.code || !p.name || !p.canonicalUnitName || !p.canonicalUnitSymbol) {
      throw new Error('CREATE_UOM_DIMENSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (
      typeof p.code !== 'string' ||
      typeof p.name !== 'string' ||
      typeof p.canonicalUnitName !== 'string' ||
      typeof p.canonicalUnitSymbol !== 'string'
    ) {
      throw new Error('CREATE_UOM_DIMENSION.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (!CODE_PATTERN.test(p.code.trim().toUpperCase())) {
      throw new Error('CREATE_UOM_DIMENSION.CODE_INVALID');
    }

    const name = p.name.trim();
    if (name.length === 0 || name.length > 100) {
      throw new Error('CREATE_UOM_DIMENSION.NAME_LIMIT_CHAR');
    }

    const unitName = p.canonicalUnitName.trim();
    if (unitName.length === 0 || unitName.length > 100) {
      throw new Error('CREATE_UOM_DIMENSION.CANONICAL_UNIT_NAME_LIMIT_CHAR');
    }

    const unitSymbol = p.canonicalUnitSymbol.trim();
    if (unitSymbol.length === 0 || unitSymbol.length > 20) {
      throw new Error('CREATE_UOM_DIMENSION.CANONICAL_UNIT_SYMBOL_LIMIT_CHAR');
    }

    if (p.isActive !== undefined && p.isActive !== null && typeof p.isActive !== 'boolean') {
      throw new Error('CREATE_UOM_DIMENSION.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
