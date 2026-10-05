import { Topping } from '../../../Domains/toppings/entities/Topping';
import { ToppingRepository } from '../../../Domains/toppings/ToppingRepository';

/**
 * UseCase: GetToppingsUseCase — read side of the GLOBAL topping catalog
 * (doc 51 §5.0 / §10).
 *
 * `list`       → the whole catalog (management page, guard product.read).
 * `detail`     → a single entry by id.
 * `listActive` → active-only entries, consumed by the POS modifier panel
 *                (GET /sales/pos/toppings, guard sales.manage).
 */
export class GetToppingsUseCase {
  constructor(private readonly toppingRepository: ToppingRepository) {}

  async list(companyId: string): Promise<Topping[]> {
    return this.toppingRepository.list(companyId);
  }

  async detail(id: string, companyId: string): Promise<Topping> {
    return this.toppingRepository.getById(id, companyId);
  }

  async listActive(companyId: string): Promise<Topping[]> {
    return this.toppingRepository.listActive(companyId);
  }
}
