/**
 * Domain Entity: UpdateProductUomConversion
 *
 * Validates a partial-update payload for a product UOM conversion. Only the
 * conversion factor and active flag are mutable; the alternate uom (uomId) and
 * owning product are fixed after creation (changing them would be equivalent to
 * creating a different conversion). At least one updatable field is required.
 */
export interface UpdateProductUomConversionFields {
  factorToBase?: number;
  isActive?: boolean;
}

const UPDATABLE_KEYS: (keyof UpdateProductUomConversionFields)[] = ['factorToBase', 'isActive'];

export class UpdateProductUomConversion {
  public readonly fields: UpdateProductUomConversionFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    const fields: UpdateProductUomConversionFields = {};

    if (p.factorToBase !== undefined) fields.factorToBase = Number(p.factorToBase);
    if (p.isActive !== undefined) fields.isActive = Boolean(p.isActive);

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (UPDATABLE_KEYS.every((key) => p[key] === undefined)) {
      throw new Error('UPDATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (p.factorToBase !== undefined) {
      if (typeof p.factorToBase !== 'number' || !Number.isFinite(p.factorToBase)) {
        throw new Error('UPDATE_PRODUCT_UOM_CONVERSION.FACTOR_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (p.factorToBase <= 0) {
        throw new Error('UPDATE_PRODUCT_UOM_CONVERSION.FACTOR_MUST_BE_POSITIVE');
      }
    }

    if (p.isActive !== undefined && typeof p.isActive !== 'boolean') {
      throw new Error('UPDATE_PRODUCT_UOM_CONVERSION.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
