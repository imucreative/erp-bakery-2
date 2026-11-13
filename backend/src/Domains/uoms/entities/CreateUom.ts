import { UOM_DIMENSION_CODE_PATTERN, type UomDimension } from '../uomDimension';
import { UOM_CODE_PATTERN } from '../uomCode';

/**
 * Domain Entity: CreateUom
 *
 * Validates payload for creating a unit of measure. The client may supply a
 * custom `code` (normalised to uppercase, unique among active UOMs of the
 * company); when omitted or blank the use case generates one (UOM-###).
 *
 * Global conversion metadata is required for new UOMs:
 *   - dimension: code from `uom_dimensions` (existence enforced by FK)
 *   - factorToCanonical: 1 <uom> = factorToCanonical <canonical unit>
 *     and must be >= 1 because the canonical unit is the smallest unit.
 */
export class CreateUom {
  public readonly code: string | null;
  public readonly name: string;
  public readonly dimension: UomDimension;
  public readonly factorToCanonical: number;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { code, name, dimension, factorToCanonical } = payload as Record<string, unknown>;
    const rawCode = code ? (code as string).trim() : '';
    this.code = rawCode.length > 0 ? rawCode.toUpperCase() : null;
    this.name = (name as string).trim();
    this.dimension = (dimension as string).trim().toUpperCase();
    this.factorToCanonical = Number(factorToCanonical);
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { code, name, dimension, factorToCanonical } = payload as Record<string, unknown>;

    if (!name || !dimension || factorToCanonical === undefined || factorToCanonical === null) {
      throw new Error('CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (code !== undefined && code !== null && typeof code !== 'string') {
      throw new Error('CREATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (typeof name !== 'string') {
      throw new Error('CREATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (
      typeof code === 'string' &&
      code.trim().length > 0 &&
      !UOM_CODE_PATTERN.test(code.trim().toUpperCase())
    ) {
      throw new Error('CREATE_UOM.CODE_INVALID');
    }

    if (name.trim().length === 0 || name.trim().length > 100) {
      throw new Error('CREATE_UOM.NAME_LIMIT_CHAR');
    }

    if (
      typeof dimension !== 'string' ||
      !UOM_DIMENSION_CODE_PATTERN.test(dimension.trim().toUpperCase())
    ) {
      throw new Error('CREATE_UOM.DIMENSION_INVALID');
    }

    if (
      typeof factorToCanonical !== 'number' ||
      !Number.isFinite(factorToCanonical) ||
      factorToCanonical <= 0
    ) {
      throw new Error('CREATE_UOM.FACTOR_INVALID');
    }

    if (factorToCanonical < 1) {
      throw new Error('CREATE_UOM.FACTOR_BELOW_CANONICAL');
    }
  }
}
