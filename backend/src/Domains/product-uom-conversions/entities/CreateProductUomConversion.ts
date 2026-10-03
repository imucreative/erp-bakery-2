/**
 * Domain Entity: CreateProductUomConversion
 *
 * Validates and normalises the payload for creating a per-product UOM
 * conversion. Referential integrity (product/uom belong to the company and are
 * active, alternate uom ≠ product base uom) and duplicate detection are enforced
 * by the use case, not here.
 *
 * Semantics: 1 <uomId> = factorToBase <product base unit>; factorToBase must be
 * a finite number strictly greater than zero.
 */
export class CreateProductUomConversion {
  public readonly uomId: string;
  public readonly factorToBase: number;
  public readonly isActive: boolean;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;

    this.uomId = (p.uomId as string).trim();
    this.factorToBase = Number(p.factorToBase);
    this.isActive = p.isActive === undefined || p.isActive === null ? true : Boolean(p.isActive);
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.uomId) {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (typeof p.uomId !== 'string') {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (p.factorToBase === undefined || p.factorToBase === null) {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (typeof p.factorToBase !== 'number' || !Number.isFinite(p.factorToBase)) {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.FACTOR_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.factorToBase <= 0) {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.FACTOR_MUST_BE_POSITIVE');
    }

    if (
      p.isActive !== undefined &&
      p.isActive !== null &&
      typeof p.isActive !== 'boolean'
    ) {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
