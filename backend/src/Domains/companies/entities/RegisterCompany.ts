/**
 * Domain Entity: RegisterCompany
 *
 * Validates payload for registering a new company (SaaS tenant).
 * Mirrors sample-be RegisterUser pattern: validate in constructor,
 * throw domain error codes that DomainErrorTranslator maps to HTTP errors.
 */
export class RegisterCompany {
  public readonly name: string;
  public readonly slug: string;
  public readonly ownerName: string;
  public readonly ownerEmail: string;
  public ownerPassword: string; // mutable — will be replaced with hash

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { name, slug, ownerName, ownerEmail, ownerPassword } =
      payload as Record<string, string>;

    this.name = name.trim();
    this.slug = slug.trim().toLowerCase();
    this.ownerName = ownerName.trim();
    this.ownerEmail = ownerEmail.trim().toLowerCase();
    this.ownerPassword = ownerPassword;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { name, slug, ownerName, ownerEmail, ownerPassword } =
      payload as Record<string, unknown>;

    if (!name || !slug || !ownerName || !ownerEmail || !ownerPassword) {
      throw new Error('REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (
      typeof name !== 'string' ||
      typeof slug !== 'string' ||
      typeof ownerName !== 'string' ||
      typeof ownerEmail !== 'string' ||
      typeof ownerPassword !== 'string'
    ) {
      throw new Error('REGISTER_COMPANY.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (name.trim().length > 100) {
      throw new Error('REGISTER_COMPANY.NAME_LIMIT_CHAR');
    }

    // Validate slug on RAW input (before any normalisation) so uppercase,
    // spaces, and special chars are caught as-submitted.
    if (!/^[a-z0-9-]+$/.test((slug as string).trim())) {
      throw new Error('REGISTER_COMPANY.SLUG_CONTAIN_RESTRICTED_CHARACTER');
    }
  }
}
