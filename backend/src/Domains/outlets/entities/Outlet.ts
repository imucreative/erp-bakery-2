/**
 * Domain Entity: Outlet
 * Value object returned after reading an outlet record.
 */
export class Outlet {
  public readonly id: string;
  public readonly companyId: string;
  public readonly code: string;
  public readonly name: string;
  public readonly address: string | null;
  public readonly phone: string | null;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    code: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const { id, companyId, code, name, address, phone, isActive, createdAt, updatedAt } =
      payload;

    if (!id || !companyId || !code || !name) {
      throw new Error('OUTLET.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.code = code;
    this.name = name;
    this.address = address ?? null;
    this.phone = phone ?? null;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
