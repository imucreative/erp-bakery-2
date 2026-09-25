/**
 * Domain Entity: Uom
 * Value object returned after reading a unit-of-measure record.
 */
export class Uom {
  public readonly id: string;
  public readonly companyId: string;
  public readonly code: string;
  public readonly name: string;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    code: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const { id, companyId, code, name, isActive, createdAt, updatedAt } = payload;

    if (!id || !companyId || !code || !name) {
      throw new Error('UOM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.code = code;
    this.name = name;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
