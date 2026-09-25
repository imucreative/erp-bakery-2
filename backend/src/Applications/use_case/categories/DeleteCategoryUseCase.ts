import { CategoryRepository } from '../../../Domains/categories/CategoryRepository';

/**
 * UseCase: DeleteCategoryUseCase
 * Soft-deletes a category, blocking when it is still referenced by active products (409).
 */
export class DeleteCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    await this.categoryRepository.getCategoryById(id, companyId);

    const dependents = await this.categoryRepository.countActiveDependents(id, companyId);
    if (dependents > 0) {
      throw new Error('CATEGORY.IN_USE');
    }

    await this.categoryRepository.softDeleteCategory(id, companyId);
  }
}
