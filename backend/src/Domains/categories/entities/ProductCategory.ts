/**
 * Domain Entity: ProductCategory
 * Value object returned after reading a product category record.
 */
export class ProductCategory {
  public readonly id: string;
  public readonly companyId: string;
  public readonly productGroupId: string;
  public readonly code: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    productGroupId: string;
    code: string;
    name: string;
    description?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const {
      id,
      companyId,
      productGroupId,
      code,
      name,
      description,
      isActive,
      createdAt,
      updatedAt,
    } = payload;

    if (!id || !companyId || !productGroupId || !code || !name) {
      throw new Error('CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.productGroupId = productGroupId;
    this.code = code;
    this.name = name;
    this.description = description ?? null;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
