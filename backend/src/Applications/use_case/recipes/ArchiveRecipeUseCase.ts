import { Recipe } from '../../../Domains/recipes/entities/Recipe';
import { RecipeRepository } from '../../../Domains/recipes/RecipeRepository';

/**
 * UseCase: ArchiveRecipeUseCase — DRAFT/ACTIVE -> ARCHIVED.
 */
export class ArchiveRecipeUseCase {
  constructor(private readonly recipeRepository: RecipeRepository) {}

  async execute(id: string, companyId: string): Promise<Recipe> {
    return this.recipeRepository.archive(id, companyId);
  }
}
