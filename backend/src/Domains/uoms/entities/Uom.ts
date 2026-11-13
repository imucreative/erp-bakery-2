import type { UomDimension } from '../uomDimension';

/**
 * Domain Entity: Uom
 * Value object returned after reading a unit-of-measure record.
 *
 * `dimension`/`factorToCanonical` describe the global physical conversion
 * (doc 52 B2). They are nullable for legacy rows created before the UOM
 * metadata migration; new UOMs require them.
 */
export class Uom {
  public readonly id: string;
  public readonly companyId: string;
  public readonly code: string;
  public readonly name: string;
  public readonly isActive: boolean;
  public readonly dimension: UomDimension | null;
  public readonly factorToCanonical: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    code: string;
    name: string;
    isActive: boolean;
    dimension?: UomDimension | null;
    factorToCanonical?: number | string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const {
      id,
      companyId,
      code,
      name,
      isActive,
      dimension,
      factorToCanonical,
      createdAt,
      updatedAt,
    } = payload;

    if (!id || !companyId || !code || !name) {
      throw new Error('UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.code = code;
    this.name = name;
    this.isActive = isActive;
    this.dimension = dimension ?? null;
    this.factorToCanonical =
      factorToCanonical === undefined || factorToCanonical === null
        ? null
        : Number(factorToCanonical);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
