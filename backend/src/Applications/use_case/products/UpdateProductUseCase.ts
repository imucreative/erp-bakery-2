import { Product } from '../../../Domains/products/entities/Product';
import { UpdateProduct } from '../../../Domains/products/entities/UpdateProduct';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { ProductTypeRepository } from '../../../Domains/product-types/ProductTypeRepository';

/**
 * UseCase: UpdateProductUseCase
 *
 * Validates the partial payload. When a non-null barcode is supplied, re-checks
 * its uniqueness within the company (excluding the record being updated).
 * SKU and foreign keys are immutable, so no cross-reference re-validation is needed.
 */
export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<Product> {
    const updateProduct = new UpdateProduct(payload);

    if (updateProduct.fields.productType !== undefined) {
      const active = await this.productTypeRepository.isActive(updateProduct.fields.productType);
      if (!active) {
        throw new Error('UPDATE_PRODUCT.INVALID_PRODUCT_TYPE');
      }
    }

    if (updateProduct.fields.barcode) {
      await this.productRepository.verifyAvailableBarcode(
        updateProduct.fields.barcode,
        companyId,
        id,
      );
    }

    return this.productRepository.updateProduct(id, companyId, updateProduct.fields);
  }
}
