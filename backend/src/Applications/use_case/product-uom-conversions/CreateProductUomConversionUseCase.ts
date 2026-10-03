import { CreateProductUomConversion } from '../../../Domains/product-uom-conversions/entities/CreateProductUomConversion';
import { ProductUomConversion } from '../../../Domains/product-uom-conversions/entities/ProductUomConversion';
import { ProductUomConversionRepository } from '../../../Domains/product-uom-conversions/ProductUomConversionRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: CreateProductUomConversionUseCase
 *
 * 1. Validate & normalise input (via CreateProductUomConversion domain entity:
 *    factorToBase numeric > 0; uomId required)
 * 2. Confirm the product exists within the company (PRODUCT.NOT_FOUND otherwise)
 * 3. Confirm the alternate UOM exists within the company and is active
 *    (UOM.NOT_FOUND / CREATE_PRODUCT_UOM_CONVERSION.UOM_INACTIVE)
 * 4. Enforce the base-unit invariant: the alternate UOM must NOT equal the
 *    product's base unit (products.uom_id) — the base unit cannot be redefined
 * 5. Persist; the repository translates the UNIQUE(product_id, uom_id) violation
 *    into PRODUCT_UOM_CONVERSION.DUPLICATE
 *
 * ADITIF & OPT-IN: the stored conversion is NOT consumed by any posting path.
 */
export class CreateProductUomConversionUseCase {
  constructor(
    private readonly conversionRepository: ProductUomConversionRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
  ) {}

  async execute(
    productId: string,
    payload: unknown,
    companyId: string,
  ): Promise<ProductUomConversion> {
    const createConversion = new CreateProductUomConversion(payload);

    const product = await this.productRepository.getProductById(productId, companyId);

    const uom = await this.uomRepository.getUomById(createConversion.uomId, companyId);
    if (!uom.isActive) {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.UOM_INACTIVE');
    }

    if (createConversion.uomId === product.uomId) {
      throw new Error('CREATE_PRODUCT_UOM_CONVERSION.UOM_IS_BASE_UNIT');
    }

    return this.conversionRepository.add(
      {
        productId,
        uomId: createConversion.uomId,
        factorToBase: createConversion.factorToBase,
        isActive: createConversion.isActive,
      },
      companyId,
    );
  }
}
