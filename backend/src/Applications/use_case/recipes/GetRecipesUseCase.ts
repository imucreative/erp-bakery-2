import { RecipeRepository, RecipeListResult } from '../../../Domains/recipes/RecipeRepository';
import { Recipe } from '../../../Domains/recipes/entities/Recipe';
import { isRecipeStatus } from '../../../Domains/recipes/recipeStatus';

export interface RecipeListQuery {
  limit: number;
  offset: number;
  productId?: string;
  status?: string;
  search?: string;
}

/** UseCase: GetRecipesUseCase — list + detail (read). */
export class GetRecipesUseCase {
  constructor(private readonly recipeRepository: RecipeRepository) {}

  async list(query: RecipeListQuery, companyId: string): Promise<RecipeListResult> {
    if (query.status && !isRecipeStatus(query.status)) {
      throw new Error('RECIPE.INVALID_STATUS');
    }
    return this.recipeRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      productId: query.productId,
      status: query.status,
      search: query.search,
    });
  }

  async detail(id: string, companyId: string): Promise<Recipe> {
    return this.recipeRepository.getById(id, companyId);
  }
}
