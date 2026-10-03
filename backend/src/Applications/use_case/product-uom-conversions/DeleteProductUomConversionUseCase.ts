import { ProductUomConversionRepository } from '../../../Domains/product-uom-conversions/ProductUomConversionRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';

/**
 * UseCase: DeleteProductUomConversionUseCase
 *
 * 1. Confirm the product exists within the company (PRODUCT.NOT_FOUND otherwise)
 * 2. Hard-delete the conversion; the repository confirms the row exists within
 *    product + company (PRODUCT_UOM_CONVERSION.NOT_FOUND otherwise)
 *
 * Hard-delete is safe here: in T1 no posting path references this master data.
 */
export class DeleteProductUomConversionUseCase {
  constructor(
    private readonly conversionRepository: ProductUomConversionRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(productId: string, id: string, companyId: string): Promise<void> {
    await this.productRepository.getProductById(productId, companyId);
    await this.conversionRepository.remove(id, productId, companyId);
  }
}
