/**
 * Domain Entity: Role
 * Represents a role record — used as a value object when reading role data.
 */
export class Role {
  public readonly id: string;
  public readonly companyId: string | null;
  public readonly code: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly isActive: boolean;

  constructor(payload: {
    id: string;
    companyId: string | null;
    code: string;
    name: string;
    description?: string | null;
    isActive: boolean;
  }) {
    const { id, companyId, code, name, description, isActive } = payload;

    if (!id || !code || !name) {
      throw new Error('ROLE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.code = code;
    this.name = name;
    this.description = description ?? null;
    this.isActive = isActive;
  }
}
