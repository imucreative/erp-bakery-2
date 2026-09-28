import { CreateRecipe } from '../../../Domains/recipes/entities/CreateRecipe';
import { Recipe } from '../../../Domains/recipes/entities/Recipe';
import { RecipeRepository } from '../../../Domains/recipes/RecipeRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: CreateRecipeUseCase
 *
 * 1. Validate payload (CreateRecipe entity — includes cross-checks like
 *    ingredient != finished product, no duplicates, loss range)
 * 2. Confirm finished product + yield UOM exist in the company
 * 3. Confirm every ingredient product + its UOM exist in the company
 * 4. Persist a DRAFT recipe
 */
export class CreateRecipeUseCase {
  constructor(
    private readonly recipeRepository: RecipeRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
  ) {}

  async execute(payload: unknown, companyId: string): Promise<Recipe> {
    const draft = new CreateRecipe(payload);

    // Finished product + yield UOM must exist (throws PRODUCT/UOM.NOT_FOUND)
    await this.productRepository.getProductById(draft.productId, companyId);
    await this.uomRepository.getUomById(draft.yieldUomId, companyId);

    // Each ingredient product + its UOM must exist
    for (const item of draft.items) {
      await this.productRepository.getProductById(item.ingredientProductId, companyId);
      await this.uomRepository.getUomById(item.uomId, companyId);
    }

    return this.recipeRepository.createDraft(companyId, {
      name: draft.name,
      productId: draft.productId,
      yieldQty: draft.yieldQty,
      yieldUomId: draft.yieldUomId,
      instructions: draft.instructions,
      items: draft.items,
    });
  }
}
