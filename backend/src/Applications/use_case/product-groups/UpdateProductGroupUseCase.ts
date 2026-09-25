import { ProductGroup } from '../../../Domains/product-groups/entities/ProductGroup';
import { UpdateProductGroup } from '../../../Domains/product-groups/entities/UpdateProductGroup';
import { ProductGroupRepository } from '../../../Domains/product-groups/ProductGroupRepository';

/**
 * UseCase: UpdateProductGroupUseCase
 *
 * 1. Validate the partial payload (via UpdateProductGroup domain entity)
 * 2. If deactivating, enforce master-data dependency protection: a group still
 *    referenced by active categories/products cannot be deactivated (409).
 * 3. Apply the update scoped to the company tenant.
 */
export class UpdateProductGroupUseCase {
  constructor(private readonly productGroupRepository: ProductGroupRepository) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<ProductGroup> {
    const updateProductGroup = new UpdateProductGroup(payload);

    if (updateProductGroup.fields.isActive === false) {
      const dependents = await this.productGroupRepository.countActiveDependents(id, companyId);
      if (dependents > 0) {
        throw new Error('PRODUCT_GROUP.IN_USE');
      }
    }

    return this.productGroupRepository.updateProductGroup(
      id,
      companyId,
      updateProductGroup.fields,
    );
  }
}
