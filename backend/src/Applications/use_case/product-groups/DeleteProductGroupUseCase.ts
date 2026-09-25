import { ProductGroupRepository } from '../../../Domains/product-groups/ProductGroupRepository';

/**
 * UseCase: DeleteProductGroupUseCase
 *
 * Soft-deletes a product group, enforcing master-data dependency protection:
 * a group still referenced by active categories/products cannot be deleted (409).
 */
export class DeleteProductGroupUseCase {
  constructor(private readonly productGroupRepository: ProductGroupRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    // Existence + tenant check (throws PRODUCT_GROUP.NOT_FOUND)
    await this.productGroupRepository.getProductGroupById(id, companyId);

    const dependents = await this.productGroupRepository.countActiveDependents(id, companyId);
    if (dependents > 0) {
      throw new Error('PRODUCT_GROUP.IN_USE');
    }

    await this.productGroupRepository.softDeleteProductGroup(id, companyId);
  }
}
