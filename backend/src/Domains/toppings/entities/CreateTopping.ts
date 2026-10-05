/**
 * Domain Entity: CreateTopping
 *
 * Validates and normalises the payload for adding an entry to the GLOBAL
 * topping catalog (doc 51 §4.5a/§5.0). Referential integrity (topping product
 * belongs to the company, exists, and is RAW_MATERIAL / SEMI_FINISHED) and
 * uniqueness per company are enforced by the use case / repository, not here.
 *
 * `defaultQtyPerItem` must be a finite number strictly greater than zero.
 * `extraPrice` must be a finite number greater than or equal to zero
 * (defaults to 0). `sortOrder` defaults to 0, `isActive` to true.
 */
export class CreateTopping {
  public readonly toppingProductId: string;
  public readonly defaultQtyPerItem: number;
  public readonly extraPrice: number;
  public readonly sortOrder: number;
  public readonly isActive: boolean;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;

    this.toppingProductId = (p.toppingProductId as string).trim();
    this.defaultQtyPerItem = Number(p.defaultQtyPerItem);
    this.extraPrice =
      p.extraPrice === undefined || p.extraPrice === null ? 0 : Number(p.extraPrice);
    this.sortOrder =
      p.sortOrder === undefined || p.sortOrder === null ? 0 : Number(p.sortOrder);
    this.isActive =
      p.isActive === undefined || p.isActive === null ? true : Boolean(p.isActive);
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (!p.toppingProductId) {
      throw new Error('CREATE_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (typeof p.toppingProductId !== 'string') {
      throw new Error('CREATE_TOPPING.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (p.defaultQtyPerItem === undefined || p.defaultQtyPerItem === null) {
      throw new Error('CREATE_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    if (typeof p.defaultQtyPerItem !== 'number' || !Number.isFinite(p.defaultQtyPerItem)) {
      throw new Error('CREATE_TOPPING.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.defaultQtyPerItem <= 0) {
      throw new Error('CREATE_TOPPING.QTY_MUST_BE_POSITIVE');
    }

    if (p.extraPrice !== undefined && p.extraPrice !== null) {
      if (typeof p.extraPrice !== 'number' || !Number.isFinite(p.extraPrice)) {
        throw new Error('CREATE_TOPPING.EXTRA_PRICE_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (p.extraPrice < 0) {
        throw new Error('CREATE_TOPPING.EXTRA_PRICE_MUST_BE_NON_NEGATIVE');
      }
    }

    if (p.sortOrder !== undefined && p.sortOrder !== null) {
      if (typeof p.sortOrder !== 'number' || !Number.isInteger(p.sortOrder)) {
        throw new Error('CREATE_TOPPING.NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
    }

    if (p.isActive !== undefined && p.isActive !== null && typeof p.isActive !== 'boolean') {
      throw new Error('CREATE_TOPPING.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
