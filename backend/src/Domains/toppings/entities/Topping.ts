/**
 * Domain Entity: Topping
 *
 * Value object returned after reading a GLOBAL topping-catalog entry
 * (doc 51 §4.5a/§5.0). `defaultQtyPerItem` (NUMERIC(18,3)) and `extraPrice`
 * (NUMERIC(18,2)) are normalised to JS numbers.
 *
 * Semantics: the topping stock product `toppingProductId` is available at POS
 * for every sellable product with `has_toppings = true` in MADE_TO_ORDER mode;
 * selecting it backflushes `defaultQtyPerItem` of the topping (in the topping's
 * master UOM) and adds `extraPrice` to the line. The catalog is GLOBAL per
 * company — a topping product appears at most once.
 *
 * The optional `toppingName`/`toppingSku`/`uomId`/`uomCode` are display
 * conveniences populated by the repository via a join to `products`/`uoms`;
 * they are not part of the stored row.
 */
export class Topping {
  public readonly id: string;
  public readonly companyId: string;
  public readonly toppingProductId: string;
  public readonly defaultQtyPerItem: number;
  public readonly extraPrice: number;
  public readonly sortOrder: number;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly toppingName: string | null;
  public readonly toppingSku: string | null;
  public readonly uomId: string | null;
  public readonly uomCode: string | null;

  constructor(payload: {
    id: string;
    companyId: string;
    toppingProductId: string;
    defaultQtyPerItem: number | string;
    extraPrice: number | string;
    sortOrder: number | string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    toppingName?: string | null;
    toppingSku?: string | null;
    uomId?: string | null;
    uomCode?: string | null;
  }) {
    const {
      id,
      companyId,
      toppingProductId,
      defaultQtyPerItem,
      extraPrice,
      sortOrder,
      isActive,
      createdAt,
      updatedAt,
      toppingName,
      toppingSku,
      uomId,
      uomCode,
    } = payload;

    if (!id || !companyId || !toppingProductId) {
      throw new Error('TOPPING.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.toppingProductId = toppingProductId;
    this.defaultQtyPerItem = Number(defaultQtyPerItem);
    this.extraPrice = Number(extraPrice);
    this.sortOrder = Number(sortOrder);
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.toppingName = toppingName ?? null;
    this.toppingSku = toppingSku ?? null;
    this.uomId = uomId ?? null;
    this.uomCode = uomCode ?? null;
  }
}
