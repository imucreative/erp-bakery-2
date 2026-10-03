import { UpdateProductUomConversion } from '../../../Domains/product-uom-conversions/entities/UpdateProductUomConversion';
import { ProductUomConversion } from '../../../Domains/product-uom-conversions/entities/ProductUomConversion';
import { ProductUomConversionRepository } from '../../../Domains/product-uom-conversions/ProductUomConversionRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';

/**
 * UseCase: UpdateProductUomConversionUseCase
 *
 * 1. Validate & normalise input (via UpdateProductUomConversion domain entity:
 *    factorToBase > 0 when present; at least one field)
 * 2. Confirm the product exists within the company (PRODUCT.NOT_FOUND otherwise)
 * 3. Update factor_to_base / is_active; the repository confirms the conversion
 *    exists within product + company (PRODUCT_UOM_CONVERSION.NOT_FOUND otherwise)
 *
 * The alternate uom and owning product are immutable here by design.
 */
export class UpdateProductUomConversionUseCase {
  constructor(
    private readonly conversionRepository: ProductUomConversionRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    productId: string,
    id: string,
    payload: unknown,
    companyId: string,
  ): Promise<ProductUomConversion> {
    const updateConversion = new UpdateProductUomConversion(payload);

    await this.productRepository.getProductById(productId, companyId);

    return this.conversionRepository.update(id, productId, companyId, updateConversion.fields);
  }
}
