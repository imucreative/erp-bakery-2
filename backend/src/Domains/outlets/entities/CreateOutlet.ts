/**
 * Domain Entity: CreateOutlet
 *
 * Validates payload for creating an outlet. The client may supply a custom
 * `code` (normalised to uppercase, unique per company); when omitted or blank
 * the use case generates one (OUT-### scoped per company).
 * Mirrors RegisterCompany validation style: validate in constructor, throw
 * domain error codes that DomainErrorTranslator maps to HTTP errors.
 */
export class CreateOutlet {
  public readonly code: string | null;
  public readonly name: string;
  public readonly address: string | null;
  public readonly phone: string | null;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const { code, name, address, phone } = payload as Record<string, unknown>;

    const rawCode = code ? (code as string).trim() : '';
    this.code = rawCode.length > 0 ? rawCode.toUpperCase() : null;
    this.name = (name as string).trim();
    this.address = address ? (address as string).trim() : null;
    this.phone = phone ? (phone as string).trim() : null;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { code, name, address, phone } = payload as Record<string, unknown>;

    if (!name) {
      throw new Error('CREATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (typeof name !== 'string') {
      throw new Error('CREATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (code !== undefined && code !== null && typeof code !== 'string') {
      throw new Error('CREATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (address !== undefined && address !== null && typeof address !== 'string') {
      throw new Error('CREATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      throw new Error('CREATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (name.trim().length === 0 || name.trim().length > 100) {
      throw new Error('CREATE_OUTLET.NAME_LIMIT_CHAR');
    }

    if (code && (code as string).trim().length > 20) {
      throw new Error('CREATE_OUTLET.CODE_LIMIT_CHAR');
    }

    if (phone && (phone as string).trim().length > 30) {
      throw new Error('CREATE_OUTLET.PHONE_LIMIT_CHAR');
    }
  }
}
