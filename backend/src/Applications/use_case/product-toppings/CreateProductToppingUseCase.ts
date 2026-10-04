import { CreateProductTopping } from '../../../Domains/product-toppings/entities/CreateProductTopping';
import { ProductTopping } from '../../../Domains/product-toppings/entities/ProductTopping';
import { ProductToppingRepository } from '../../../Domains/product-toppings/ProductToppingRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';

const ALLOWED_TOPPING_TYPES = ['RAW_MATERIAL', 'SEMI_FINISHED'];

/**
 * UseCase: CreateProductToppingUseCase
 *
 * 1. Validate & normalise input (via CreateProductTopping domain entity:
 *    defaultQtyPerItem > 0; extraPrice >= 0; toppingProductId required)
 * 2. Confirm the sellable product exists within the company
 *    (PRODUCT.NOT_FOUND otherwise)
 * 3. Reject self-topping (topping == owning product) → PRODUCT_TOPPING.SELF_TOPPING
 * 4. Confirm the topping product exists within the company and is of type
 *    RAW_MATERIAL or SEMI_FINISHED (else PRODUCT_TOPPING.INVALID_TOPPING_TYPE)
 * 5. Persist; the repository translates UNIQUE(product_id, topping_product_id)
 *    into PRODUCT_TOPPING.DUPLICATE
 *
 * Deliberately permissive (keputusan user): the owning product is NOT required
 * to have an ACTIVE recipe — POS enforces topping effect only for MADE_TO_ORDER.
 */
export class CreateProductToppingUseCase {
  constructor(
    private readonly toppingRepository: ProductToppingRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    productId: string,
    payload: unknown,
    companyId: string,
  ): Promise<ProductTopping> {
    const createTopping = new CreateProductTopping(payload);

    await this.productRepository.getProductById(productId, companyId);

    if (createTopping.toppingProductId === productId) {
      throw new Error('PRODUCT_TOPPING.SELF_TOPPING');
    }

    const toppingProduct = await this.productRepository.getProductById(
      createTopping.toppingProductId,
      companyId,
    );
    if (!ALLOWED_TOPPING_TYPES.includes(toppingProduct.productType)) {
      throw new Error('PRODUCT_TOPPING.INVALID_TOPPING_TYPE');
    }

    return this.toppingRepository.add(
      {
        productId,
        toppingProductId: createTopping.toppingProductId,
        defaultQtyPerItem: createTopping.defaultQtyPerItem,
        extraPrice: createTopping.extraPrice,
        sortOrder: createTopping.sortOrder,
        isActive: createTopping.isActive,
      },
      companyId,
    );
  }
}
