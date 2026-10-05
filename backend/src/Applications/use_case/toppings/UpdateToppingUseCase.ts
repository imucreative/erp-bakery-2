import { UpdateTopping } from '../../../Domains/toppings/entities/UpdateTopping';
import { Topping } from '../../../Domains/toppings/entities/Topping';
import { ToppingRepository } from '../../../Domains/toppings/ToppingRepository';

/**
 * UseCase: UpdateToppingUseCase (GLOBAL topping catalog, doc 51 §5.0)
 *
 * 1. Validate & normalise input (via UpdateTopping domain entity:
 *    defaultQtyPerItem > 0 when present; extraPrice >= 0 when present; at least
 *    one field)
 * 2. Update qty / extra price / sort order / active flag; the repository confirms
 *    the entry exists within the company (TOPPING.NOT_FOUND otherwise)
 *
 * The topping product is immutable here by design.
 */
export class UpdateToppingUseCase {
  constructor(private readonly toppingRepository: ToppingRepository) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<Topping> {
    const updateTopping = new UpdateTopping(payload);

    return this.toppingRepository.update(id, companyId, updateTopping.fields, userId);
  }
}
