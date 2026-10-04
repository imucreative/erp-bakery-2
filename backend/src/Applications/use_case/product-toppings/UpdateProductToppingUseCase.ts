import { UpdateProductTopping } from '../../../Domains/product-toppings/entities/UpdateProductTopping';
import { ProductTopping } from '../../../Domains/product-toppings/entities/ProductTopping';
import { ProductToppingRepository } from '../../../Domains/product-toppings/ProductToppingRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';

/**
 * UseCase: UpdateProductToppingUseCase
 *
 * 1. Validate & normalise input (via UpdateProductTopping domain entity:
 *    defaultQtyPerItem > 0 when present; extraPrice >= 0 when present; at least
 *    one field)
 * 2. Confirm the sellable product exists within the company
 *    (PRODUCT.NOT_FOUND otherwise)
 * 3. Update qty / extra price / sort order / active flag; the repository confirms
 *    the topping exists within product + company (PRODUCT_TOPPING.NOT_FOUND
 *    otherwise)
 *
 * The owning product and the topping product are immutable here by design.
 */
export class UpdateProductToppingUseCase {
  constructor(
    private readonly toppingRepository: ProductToppingRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    productId: string,
    id: string,
    payload: unknown,
    companyId: string,
  ): Promise<ProductTopping> {
    const updateTopping = new UpdateProductTopping(payload);

    await this.productRepository.getProductById(productId, companyId);

    return this.toppingRepository.update(id, productId, companyId, updateTopping.fields);
  }
}
