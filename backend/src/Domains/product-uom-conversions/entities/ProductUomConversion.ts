/**
 * Domain Entity: ProductUomConversion
 *
 * Value object returned after reading a product UOM conversion record.
 * `factorToBase` is a NUMERIC(18,6) column normalised to a JS number.
 *
 * Semantics: 1 <alternate uom> = factorToBase <product base unit>.
 * The optional `uomCode`/`uomName` are display conveniences populated by the
 * repository via a join to `uoms`; they are not part of the stored row.
 */
export class ProductUomConversion {
  public readonly id: string;
  public readonly companyId: string;
  public readonly productId: string;
  public readonly uomId: string;
  public readonly factorToBase: number;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly uomCode: string | null;
  public readonly uomName: string | null;

  constructor(payload: {
    id: string;
    companyId: string;
    productId: string;
    uomId: string;
    factorToBase: number | string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    uomCode?: string | null;
    uomName?: string | null;
  }) {
    const {
      id,
      companyId,
      productId,
      uomId,
      factorToBase,
      isActive,
      createdAt,
      updatedAt,
      uomCode,
      uomName,
    } = payload;

    if (!id || !companyId || !productId || !uomId) {
      throw new Error('PRODUCT_UOM_CONVERSION.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.productId = productId;
    this.uomId = uomId;
    this.factorToBase = Number(factorToBase);
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.uomCode = uomCode ?? null;
    this.uomName = uomName ?? null;
  }
}
