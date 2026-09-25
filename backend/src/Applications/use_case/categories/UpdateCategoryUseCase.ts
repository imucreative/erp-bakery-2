import { ProductCategory } from '../../../Domains/categories/entities/ProductCategory';
import { UpdateCategory } from '../../../Domains/categories/entities/UpdateCategory';
import { CategoryRepository } from '../../../Domains/categories/CategoryRepository';

/**
 * UseCase: UpdateCategoryUseCase
 * Validates the partial payload; blocks deactivation when the category is still
 * referenced by active products (master-data dependency protection → 409).
 */
export class UpdateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<ProductCategory> {
    const updateCategory = new UpdateCategory(payload);

    if (updateCategory.fields.isActive === false) {
      const dependents = await this.categoryRepository.countActiveDependents(id, companyId);
      if (dependents > 0) {
        throw new Error('CATEGORY.IN_USE');
      }
    }

    return this.categoryRepository.updateCategory(id, companyId, updateCategory.fields);
  }
}
