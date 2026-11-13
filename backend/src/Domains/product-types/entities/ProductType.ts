/**
 * Domain Entity: ProductType
 *
 * Reference value for `products.product_type`. `code` is the stable identifier
 * stored on products; `name` is the human-readable label shown in the UI.
 */
export class ProductType {
  public readonly code: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly sortOrder: number;
  public readonly isActive: boolean;

  constructor(payload: {
    code: string;
    name: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    if (!payload.code || !payload.name) {
      throw new Error('PRODUCT_TYPE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.code = payload.code.trim();
    this.name = payload.name.trim();
    this.description = payload.description ?? null;
    this.sortOrder = payload.sortOrder ?? 0;
    this.isActive = payload.isActive ?? true;
  }
}
