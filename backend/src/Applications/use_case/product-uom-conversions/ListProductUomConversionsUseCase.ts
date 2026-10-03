import { ProductUomConversion } from '../../../Domains/product-uom-conversions/entities/ProductUomConversion';
import { ProductUomConversionRepository } from '../../../Domains/product-uom-conversions/ProductUomConversionRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';

/**
 * UseCase: ListProductUomConversionsUseCase
 *
 * Lists the UOM conversions defined for a product within the current company.
 * Confirms the product exists & belongs to the company first (getProductById
 * throws PRODUCT.NOT_FOUND otherwise), then returns its conversions.
 */
export class ListProductUomConversionsUseCase {
  constructor(
    private readonly conversionRepository: ProductUomConversionRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(productId: string, companyId: string): Promise<ProductUomConversion[]> {
    await this.productRepository.getProductById(productId, companyId);
    return this.conversionRepository.listByProduct(productId, companyId);
  }
}
