/**
 * Domain Entity: Product
 * Value object returned after reading a product record. Prices and stock are
 * numeric (NUMERIC(18,2) columns) normalised to JS numbers.
 */
export class Product {
  public readonly id: string;
  public readonly companyId: string;
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
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    sku: string;
    barcode?: string | null;
    name: string;
    productGroupId: string;
    categoryId: string;
    uomId: string;
    supplierId: string;
    productType: string;
    purchasePrice: number | string;
    sellingPrice: number | string;
    minimumStock: number | string;
    shelfLifeDays: number | string;
    isBatchTracked: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const {
      id,
      companyId,
      sku,
      barcode,
      name,
      productGroupId,
      categoryId,
      uomId,
      supplierId,
      productType,
      purchasePrice,
      sellingPrice,
      minimumStock,
      shelfLifeDays,
      isBatchTracked,
      isActive,
      createdAt,
      updatedAt,
    } = payload;

    if (!id || !companyId || !sku || !name || !productGroupId || !categoryId || !uomId || !supplierId || !productType) {
      throw new Error('PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.sku = sku;
    this.barcode = barcode ?? null;
    this.name = name;
    this.productGroupId = productGroupId;
    this.categoryId = categoryId;
    this.uomId = uomId;
    this.supplierId = supplierId;
    this.productType = productType;
    this.purchasePrice = Number(purchasePrice);
    this.sellingPrice = Number(sellingPrice);
    this.minimumStock = Number(minimumStock);
    this.shelfLifeDays = Number(shelfLifeDays);
    this.isBatchTracked = isBatchTracked;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
