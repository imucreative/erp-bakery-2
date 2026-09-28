import { Recipe } from '../../../Domains/recipes/entities/Recipe';
import { RecipeRepository } from '../../../Domains/recipes/RecipeRepository';

/**
 * UseCase: ActivateRecipeUseCase — DRAFT -> ACTIVE.
 * Repository enforces one active recipe per product.
 */
export class ActivateRecipeUseCase {
  constructor(private readonly recipeRepository: RecipeRepository) {}

  async execute(id: string, companyId: string): Promise<Recipe> {
    return this.recipeRepository.activate(id, companyId);
  }
}
