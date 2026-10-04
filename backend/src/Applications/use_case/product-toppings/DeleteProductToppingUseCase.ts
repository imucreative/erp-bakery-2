import { ProductToppingRepository } from '../../../Domains/product-toppings/ProductToppingRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';

/**
 * UseCase: DeleteProductToppingUseCase
 *
 * 1. Confirm the sellable product exists within the company (PRODUCT.NOT_FOUND
 *    otherwise)
 * 2. Hard-delete the topping; the repository confirms the row exists within
 *    product + company (PRODUCT_TOPPING.NOT_FOUND otherwise)
 *
 * Hard-delete mirrors ProductUomConversion: this is configuration master data,
 * not a transactional document; past sales snapshot their own topping lines.
 */
export class DeleteProductToppingUseCase {
  constructor(
    private readonly toppingRepository: ProductToppingRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(productId: string, id: string, companyId: string): Promise<void> {
    await this.productRepository.getProductById(productId, companyId);
    await this.toppingRepository.remove(id, productId, companyId);
  }
}
