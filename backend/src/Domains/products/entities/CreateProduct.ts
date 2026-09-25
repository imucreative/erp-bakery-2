import { PRODUCT_TYPES } from '../productTypes';

/**
 * Domain Entity: CreateProduct
 *
 * Validates and normalises the payload for creating a product. Referential
 * integrity (group/category/uom/supplier belong to the company and are active,
 * and category.productGroupId === productGroupId) is enforced by the use case,
 * not here. SKU/barcode uniqueness is enforced by the use case via the repo.
 */
export class CreateProduct {
  public readonly sku: string;
  public readonly barcode: string | null;
  public readonly name: string;
  public readonly productGroupId: string;
  public readonly categoryId: string;
  public readonly uomId: string;
  public readonly supplierId: string;
  public readonly productType: string;
  public readonly purchasePrice: number;
  public readonly sellingPrice: number;
  public readonly minimumStock: number;
  public readonly shelfLifeDays: number;
  public readonly isBatchTracked: boolean;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;

    this.sku = (p.sku as string).trim();
    this.barcode = p.barcode ? (p.barcode as string).trim() : null;
    this.name = (p.name as string).trim();
    this.productGroupId = (p.productGroupId as string).trim();
    this.categoryId = (p.categoryId as string).trim();
    this.uomId = (p.uomId as string).trim();
    this.supplierId = (p.supplierId as string).trim();
    this.productType = (p.productType as string).trim();
    this.purchasePrice = this._toNumber(p.purchasePrice);
    this.sellingPrice = this._toNumber(p.sellingPrice);
    this.minimumStock = this._toNumber(p.minimumStock);
    this.shelfLifeDays = this._toInt(p.shelfLifeDays);
    this.isBatchTracked = p.isBatchTracked === undefined ? true : Boolean(p.isBatchTracked);
  }

  private _toNumber(value: unknown): number {
    return value === undefined || value === null ? 0 : Number(value);
  }

  private _toInt(value: unknown): number {
    return value === undefined || value === null ? 0 : Number(value);
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const p = payload as Record<string, unknown>;

    const requiredStrings = [
      'sku',
      'name',
      'productGroupId',
      'categoryId',
      'uomId',
      'supplierId',
      'productType',
    ];

    for (const key of requiredStrings) {
      if (!p[key]) {
        throw new Error('CREATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY');
      }
      if (typeof p[key] !== 'string') {
        throw new Error('CREATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
    }

    if (
      p.barcode !== undefined &&
      p.barcode !== null &&
      typeof p.barcode !== 'string'
    ) {
      throw new Error('CREATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    const sku = (p.sku as string).trim();
    if (sku.length === 0 || sku.length > 50) {
      throw new Error('CREATE_PRODUCT.SKU_LIMIT_CHAR');
    }
    if (p.barcode && (p.barcode as string).trim().length > 50) {
      throw new Error('CREATE_PRODUCT.BARCODE_LIMIT_CHAR');
    }
    const name = (p.name as string).trim();
    if (name.length === 0 || name.length > 150) {
      throw new Error('CREATE_PRODUCT.NAME_LIMIT_CHAR');
    }

    if (!PRODUCT_TYPES.includes((p.productType as string).trim() as never)) {
      throw new Error('CREATE_PRODUCT.INVALID_PRODUCT_TYPE');
    }

    for (const key of ['purchasePrice', 'sellingPrice', 'minimumStock']) {
      const raw = p[key];
      if (raw === undefined || raw === null) continue;
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
        throw new Error('CREATE_PRODUCT.INVALID_PRICE');
      }
    }

    if (p.shelfLifeDays !== undefined && p.shelfLifeDays !== null) {
      const raw = p.shelfLifeDays;
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
        throw new Error('CREATE_PRODUCT.INVALID_SHELF_LIFE');
      }
    }

    if (
      p.isBatchTracked !== undefined &&
      p.isBatchTracked !== null &&
      typeof p.isBatchTracked !== 'boolean'
    ) {
      throw new Error('CREATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}
