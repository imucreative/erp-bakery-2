import { RecipeRepository } from '../../../Domains/recipes/RecipeRepository';

/**
 * UseCase: DeleteRecipeUseCase — soft-delete a DRAFT recipe.
 * Only DRAFT recipes may be deleted; ACTIVE/ARCHIVED are preserved for history.
 * Status/invariant enforcement lives in the repository transaction.
 */
export class DeleteRecipeUseCase {
  constructor(private readonly recipeRepository: RecipeRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    await this.recipeRepository.softDelete(id, companyId);
  }
}
