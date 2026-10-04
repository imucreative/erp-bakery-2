import { PRODUCT_TYPES } from '../productTypes';

/**
 * Domain Entity: UpdateProduct
 *
 * Validates a partial-update payload; at least one updatable field is required.
 * SKU and the foreign keys (group/category/uom/supplier) are immutable after
 * creation — the category↔group cross-reference is fixed at create time, so
 * allowing reassignment here would risk breaking that invariant.
 */
export interface UpdateProductFields {
  name?: string;
  barcode?: string | null;
  productType?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  minimumStock?: number;
  shelfLifeDays?: number;
  isBatchTracked?: boolean;
  hasToppings?: boolean;
  isActive?: boolean;
}

const UPDATABLE_KEYS: (keyof UpdateProductFields)[] = [
  'name',
  'barcode',
  'productType',
  'purchasePrice',
  'sellingPrice',
  'minimumStock',
  'shelfLifeDays',
  'isBatchTracked',
  'hasToppings',
  'isActive',
];

export class UpdateProduct {
  public readonly fields: UpdateProductFields;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    const fields: UpdateProductFields = {};

    if (p.name !== undefined) fields.name = (p.name as string).trim();
    if (p.barcode !== undefined) {
      fields.barcode = p.barcode === null ? null : (p.barcode as string).trim();
    }
    if (p.productType !== undefined) fields.productType = (p.productType as string).trim();
    if (p.purchasePrice !== undefined) fields.purchasePrice = Number(p.purchasePrice);
    if (p.sellingPrice !== undefined) fields.sellingPrice = Number(p.sellingPrice);
    if (p.minimumStock !== undefined) fields.minimumStock = Number(p.minimumStock);
    if (p.shelfLifeDays !== undefined) fields.shelfLifeDays = Number(p.shelfLifeDays);
    if (p.isBatchTracked !== undefined) fields.isBatchTracked = Boolean(p.isBatchTracked);
    if (p.hasToppings !== undefined) fields.hasToppings = Boolean(p.hasToppings);
    if (p.isActive !== undefined) fields.isActive = Boolean(p.isActive);

    this.fields = fields;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('UPDATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    if (UPDATABLE_KEYS.every((key) => p[key] === undefined)) {
      throw new Error('UPDATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (p.name !== undefined && typeof p.name !== 'string') {
      throw new Error('UPDATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.barcode !== undefined && p.barcode !== null && typeof p.barcode !== 'string') {
      throw new Error('UPDATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.productType !== undefined && typeof p.productType !== 'string') {
      throw new Error('UPDATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (p.name !== undefined) {
      const name = (p.name as string).trim();
      if (name.length === 0 || name.length > 150) {
        throw new Error('UPDATE_PRODUCT.NAME_LIMIT_CHAR');
      }
    }
    if (p.barcode && (p.barcode as string).trim().length > 50) {
      throw new Error('UPDATE_PRODUCT.BARCODE_LIMIT_CHAR');
    }
    if (p.productType !== undefined && !PRODUCT_TYPES.includes(p.productType as never)) {
      throw new Error('UPDATE_PRODUCT.INVALID_PRODUCT_TYPE');
    }

    for (const key of ['purchasePrice', 'sellingPrice', 'minimumStock']) {
      const raw = p[key];
      if (raw === undefined) continue;
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
        throw new Error('UPDATE_PRODUCT.INVALID_PRICE');
      }
    }

    if (p.shelfLifeDays !== undefined) {
      const raw = p.shelfLifeDays;
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
        throw new Error('UPDATE_PRODUCT.INVALID_SHELF_LIFE');
      }
    }

    if (p.isBatchTracked !== undefined && typeof p.isBatchTracked !== 'boolean') {
      throw new Error('UPDATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.hasToppings !== undefined && typeof p.hasToppings !== 'boolean') {
      throw new Error('UPDATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.isActive !== undefined && typeof p.isActive !== 'boolean') {
      throw new Error('UPDATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
