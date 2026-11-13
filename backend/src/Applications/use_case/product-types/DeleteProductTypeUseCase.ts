import { ProductTypeRepository } from '../../../Domains/product-types/ProductTypeRepository';

/**
 * UseCase: delete a product type by code.
 * The repository maps the `products_product_type_fk` violation to
 * PRODUCT_TYPE.IN_USE so a type still referenced by products cannot be removed.
 */
export class DeleteProductTypeUseCase {
  constructor(private readonly productTypeRepository: ProductTypeRepository) {}

  async execute(code: string): Promise<void> {
    await this.productTypeRepository.getByCode(code);
    await this.productTypeRepository.deleteProductType(code);
  }
}
