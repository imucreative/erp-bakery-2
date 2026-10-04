import { ProductTopping } from '../../../Domains/product-toppings/entities/ProductTopping';
import { ProductToppingRepository } from '../../../Domains/product-toppings/ProductToppingRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';

/**
 * UseCase: ListProductToppingsUseCase
 *
 * Lists the allowed toppings defined for a sellable product within the current
 * company. Confirms the product exists & belongs to the company first
 * (getProductById throws PRODUCT.NOT_FOUND otherwise), then returns its
 * toppings joined with the topping product (name/sku) and its master UOM.
 */
export class ListProductToppingsUseCase {
  constructor(
    private readonly toppingRepository: ProductToppingRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(productId: string, companyId: string): Promise<ProductTopping[]> {
    await this.productRepository.getProductById(productId, companyId);
    return this.toppingRepository.listByProduct(productId, companyId);
  }
}
