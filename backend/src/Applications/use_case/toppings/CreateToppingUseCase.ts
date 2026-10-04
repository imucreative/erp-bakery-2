import { CreateTopping } from '../../../Domains/toppings/entities/CreateTopping';
import { Topping } from '../../../Domains/toppings/entities/Topping';
import { ToppingRepository } from '../../../Domains/toppings/ToppingRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';

const ALLOWED_TOPPING_TYPES = ['RAW_MATERIAL', 'SEMI_FINISHED'];

/**
 * UseCase: CreateToppingUseCase (GLOBAL topping catalog, doc 51 §5.0)
 *
 * 1. Validate & normalise input (via CreateTopping domain entity:
 *    defaultQtyPerItem > 0; extraPrice >= 0; toppingProductId required)
 * 2. Confirm the topping product exists within the company and is of type
 *    RAW_MATERIAL or SEMI_FINISHED (else TOPPING.INVALID_PRODUCT_TYPE)
 * 3. Persist; the repository translates UNIQUE(company_id, topping_product_id)
 *    into TOPPING.DUPLICATE (one topping product = one global catalog entry)
 */
export class CreateToppingUseCase {
  constructor(
    private readonly toppingRepository: ToppingRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(payload: unknown, companyId: string, userId: string | null): Promise<Topping> {
    const createTopping = new CreateTopping(payload);

    const toppingProduct = await this.productRepository.getProductById(
      createTopping.toppingProductId,
      companyId,
    );
    if (!ALLOWED_TOPPING_TYPES.includes(toppingProduct.productType)) {
      throw new Error('TOPPING.INVALID_PRODUCT_TYPE');
    }

    return this.toppingRepository.add(
      {
        toppingProductId: createTopping.toppingProductId,
        defaultQtyPerItem: createTopping.defaultQtyPerItem,
        extraPrice: createTopping.extraPrice,
        sortOrder: createTopping.sortOrder,
        isActive: createTopping.isActive,
        createdBy: userId,
      },
      companyId,
    );
  }
}
