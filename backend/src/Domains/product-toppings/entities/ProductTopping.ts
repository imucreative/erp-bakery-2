/**
 * Domain Entity: ProductTopping
 *
 * Value object returned after reading a product topping (allowed-topping join,
 * doc 51 §5 Opsi C). `defaultQtyPerItem` (NUMERIC(18,3)) and `extraPrice`
 * (NUMERIC(18,2)) are normalised to JS numbers.
 *
 * Semantics: on the sellable product `productId`, the topping stock product
 * `toppingProductId` may be chosen; selecting it backflushes
 * `defaultQtyPerItem` of the topping (in the topping's master UOM) and adds
 * `extraPrice` to the line.
 *
 * The optional `toppingName`/`toppingSku`/`uomId`/`uomCode` are display
 * conveniences populated by the repository via a join to `products`/`uoms`;
 * they are not part of the stored row.
 */
export class ProductTopping {
  public readonly id: string;
  public readonly companyId: string;
  public readonly productId: string;
  public readonly toppingProductId: string;
  public readonly defaultQtyPerItem: number;
  public readonly extraPrice: number;
  public readonly sortOrder: number;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly toppingName: string | null;
  public readonly toppingSku: string | null;
  public readonly uomId: string | null;
  public readonly uomCode: string | null;

  constructor(payload: {
    id: string;
    companyId: string;
    productId: string;
    toppingProductId: string;
    defaultQtyPerItem: number | string;
    extraPrice: number | string;
    sortOrder: number | string;
    isActive: boolean;
    createdAt: Date;
    toppingName?: string | null;
    toppingSku?: string | null;
    uomId?: string | null;
    uomCode?: string | null;
  }) {
    const {
      id,
      companyId,
      productId,
      toppingProductId,
      defaultQtyPerItem,
      extraPrice,
      sortOrder,
      isActive,
      createdAt,
      toppingName,
      toppingSku,
      uomId,
      uomCode,
    } = payload;

    if (!id || !companyId || !productId || !toppingProductId) {
      throw new Error('PRODUCT_TOPPING.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.productId = productId;
    this.toppingProductId = toppingProductId;
    this.defaultQtyPerItem = Number(defaultQtyPerItem);
    this.extraPrice = Number(extraPrice);
    this.sortOrder = Number(sortOrder);
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.toppingName = toppingName ?? null;
    this.toppingSku = toppingSku ?? null;
    this.uomId = uomId ?? null;
    this.uomCode = uomCode ?? null;
  }
}
