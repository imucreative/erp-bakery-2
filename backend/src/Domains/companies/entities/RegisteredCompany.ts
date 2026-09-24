/**
 * Domain Entity: RegisteredCompany
 * Value object returned after a company is successfully persisted.
 */
export class RegisteredCompany {
  public readonly id: string;
  public readonly code: string;
  public readonly name: string;
  public readonly slug: string;

  constructor(payload: { id: string; code: string; name: string; slug: string }) {
    const { id, code, name, slug } = payload;

    if (!id || !code || !name || !slug) {
      throw new Error('REGISTERED_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.code = code;
    this.name = name;
    this.slug = slug;
  }
}
