import { UOM_DIMENSION_CODE_PATTERN, type UomDimension } from '../uomDimension';
import { UOM_CODE_PATTERN } from '../uomCode';

/**
 * Domain Entity: UpdateUom
 *
 * Validates a partial-update payload. At least one updatable field must be
 * present. Dimension/factor are optional so legacy UOMs can be completed later.
 */
export interface UpdateUomFields {
  code?: string;
  name?: string;
  isActive?: boolean;
  dimension?: UomDimension;
  factorToCanonical?: number;
}

const UPDATABLE_KEYS: (keyof UpdateUomFields)[] = [
  'code',
  'name',
  'isActive',
  'dimension',
  'factorToCanonical',
];

export class UpdateUom {
  public readonly fields: UpdateUomFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { code, name, isActive, dimension, factorToCanonical } = payload as Record<
      string,
      unknown
    >;
    const fields: UpdateUomFields = {};

    const rawCode = typeof code === 'string' ? code.trim() : '';
    if (rawCode.length > 0) fields.code = rawCode.toUpperCase();
    if (name !== undefined) fields.name = (name as string).trim();
    if (isActive !== undefined) fields.isActive = Boolean(isActive);
    if (dimension !== undefined) {
      fields.dimension = (dimension as string).trim().toUpperCase();
    }
    if (factorToCanonical !== undefined) {
      fields.factorToCanonical = Number(factorToCanonical);
    }

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { code, name, isActive, dimension, factorToCanonical } = payload as Record<
      string,
      unknown
    >;

    if (code !== undefined && typeof code !== 'string') {
      throw new Error('UPDATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    const hasCode = typeof code === 'string' && code.trim().length > 0;

    if (
      UPDATABLE_KEYS.every((key) =>
        key === 'code' ? !hasCode : (payload as Record<string, unknown>)[key] === undefined,
      )
    ) {
      throw new Error('UPDATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (name !== undefined && typeof name !== 'string') {
      throw new Error('UPDATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (hasCode && !UOM_CODE_PATTERN.test(code.trim().toUpperCase())) {
      throw new Error('UPDATE_UOM.CODE_INVALID');
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      throw new Error('UPDATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (
      dimension !== undefined &&
      (typeof dimension !== 'string' ||
        !UOM_DIMENSION_CODE_PATTERN.test(dimension.trim().toUpperCase()))
    ) {
      throw new Error('UPDATE_UOM.DIMENSION_INVALID');
    }
    if (
      factorToCanonical !== undefined &&
      (typeof factorToCanonical !== 'number' ||
        !Number.isFinite(factorToCanonical) ||
        factorToCanonical <= 0)
    ) {
      throw new Error('UPDATE_UOM.FACTOR_INVALID');
    }
    if (
      factorToCanonical !== undefined &&
      typeof factorToCanonical === 'number' &&
      factorToCanonical > 0 &&
      factorToCanonical < 1
    ) {
      throw new Error('UPDATE_UOM.FACTOR_BELOW_CANONICAL');
    }

    if (
      name !== undefined &&
      ((name as string).trim().length === 0 || (name as string).trim().length > 100)
    ) {
      throw new Error('UPDATE_UOM.NAME_LIMIT_CHAR');
    }
  }
}
