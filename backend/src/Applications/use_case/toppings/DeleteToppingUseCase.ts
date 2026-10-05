import { ToppingRepository } from '../../../Domains/toppings/ToppingRepository';

/**
 * UseCase: DeleteToppingUseCase (GLOBAL topping catalog, doc 51 §5.0)
 *
 * Hard-delete a catalog entry; the repository confirms the row exists within
 * the company (TOPPING.NOT_FOUND otherwise). Hard-delete mirrors the former
 * per-product topping module: this is configuration master data, not a
 * transactional document, and past sales snapshot their own topping lines.
 */
export class DeleteToppingUseCase {
  constructor(private readonly toppingRepository: ToppingRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    await this.toppingRepository.remove(id, companyId);
  }
}
