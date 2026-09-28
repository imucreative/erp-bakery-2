import { UpdateRecipe } from '../../../Domains/recipes/entities/UpdateRecipe';
import { Recipe } from '../../../Domains/recipes/entities/Recipe';
import { RecipeRepository } from '../../../Domains/recipes/RecipeRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: UpdateRecipeUseCase — only a DRAFT recipe is editable.
 * Re-validates references before replacing the draft.
 */
export class UpdateRecipeUseCase {
  constructor(
    private readonly recipeRepository: RecipeRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
  ) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<Recipe> {
    const update = new UpdateRecipe(payload);

    const existing = await this.recipeRepository.getById(id, companyId);
    if (existing.status !== 'DRAFT') {
      throw new Error('RECIPE.ONLY_DRAFT_EDITABLE');
    }

    await this.productRepository.getProductById(update.productId, companyId);
    await this.uomRepository.getUomById(update.yieldUomId, companyId);

    for (const item of update.items) {
      await this.productRepository.getProductById(item.ingredientProductId, companyId);
      await this.uomRepository.getUomById(item.uomId, companyId);
    }

    return this.recipeRepository.updateDraft(id, companyId, {
      name: update.name,
      productId: update.productId,
      yieldQty: update.yieldQty,
      yieldUomId: update.yieldUomId,
      instructions: update.instructions,
      items: update.items,
    });
  }
}
