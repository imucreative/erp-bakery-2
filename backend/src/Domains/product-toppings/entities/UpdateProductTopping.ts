/**
 * Domain Entity: UpdateProductTopping
 *
 * Validates a partial-update payload for an allowed topping. The owning product
 * and the topping product are fixed after creation (changing them would be a
 * different join row). Only consumption qty, extra price, sort order and the
 * active flag are mutable. At least one updatable field is required.
 */
export interface UpdateProductToppingFields {
  defaultQtyPerItem?: number;
  extraPrice?: number;
  sortOrder?: number;
  isActive?: boolean;
}

const UPDATABLE_KEYS: (keyof UpdateProductToppingFields)[] = [
  'defaultQtyPerItem',
  'extraPrice',
  'sortOrder',
  'isActive',
];

export class UpdateProductTopping {
  public readonly fields: UpdateProductToppingFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    const fields: UpdateProductToppingFields = {};

    if (p.defaultQtyPerItem !== undefined) fields.defaultQtyPerItem = Number(p.defaultQtyPerItem);
    if (p.extraPrice !== undefined) fields.extraPrice = Number(p.extraPrice);
    if (p.sortOrder !== undefined) fields.sortOrder = Number(p.sortOrder);
    if (p.isActive !== undefined) fields.isActive = Boolean(p.isActive);

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_PRODUCT_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (UPDATABLE_KEYS.every((key) => p[key] === undefined)) {
      throw new Error('UPDATE_PRODUCT_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (p.defaultQtyPerItem !== undefined) {
      if (
        typeof p.defaultQtyPerItem !== 'number' ||
        !Number.isFinite(p.defaultQtyPerItem)
      ) {
        throw new Error('UPDATE_PRODUCT_TOPPING.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (p.defaultQtyPerItem <= 0) {
        throw new Error('UPDATE_PRODUCT_TOPPING.QTY_MUST_BE_POSITIVE');
      }
    }

    if (p.extraPrice !== undefined) {
      if (typeof p.extraPrice !== 'number' || !Number.isFinite(p.extraPrice)) {
        throw new Error('UPDATE_PRODUCT_TOPPING.EXTRA_PRICE_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (p.extraPrice < 0) {
        throw new Error('UPDATE_PRODUCT_TOPPING.EXTRA_PRICE_MUST_BE_NON_NEGATIVE');
      }
    }

    if (p.sortOrder !== undefined) {
      if (typeof p.sortOrder !== 'number' || !Number.isInteger(p.sortOrder)) {
        throw new Error('UPDATE_PRODUCT_TOPPING.NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
    }

    if (p.isActive !== undefined && typeof p.isActive !== 'boolean') {
      throw new Error('UPDATE_PRODUCT_TOPPING.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
