import { Recipe } from './entities/Recipe';
import { CreateRecipeItemInput } from './entities/CreateRecipe';

export interface NewRecipeData {
  name: string;
  productId: string;
  yieldQty: number;
  yieldUomId: string;
  instructions: string | null;
  items: CreateRecipeItemInput[];
}

export interface RecipeListFilter {
  limit: number;
  offset: number;
  productId?: string;
  status?: string;
  search?: string;
}

export interface RecipeListResult {
  rows: Recipe[];
  total: number;
}

/**
 * Abstract repository — Recipe (BOM) domain. Company-scoped, soft-deletable.
 */
export abstract class RecipeRepository {
  /** Create a DRAFT recipe + items. Generates RCP-YYYY-NNNNNN. */
  abstract createDraft(companyId: string, data: NewRecipeData): Promise<Recipe>;

  /** Replace a DRAFT recipe. Throws if not DRAFT. */
  abstract updateDraft(id: string, companyId: string, data: NewRecipeData): Promise<Recipe>;

  abstract getById(id: string, companyId: string): Promise<Recipe>;

  abstract list(companyId: string, filter: RecipeListFilter): Promise<RecipeListResult>;

  /**
   * DRAFT -> ACTIVE. Enforces at most one ACTIVE recipe per product
   * (DB partial unique index + explicit check). Throws
   * RECIPE.ACTIVE_ALREADY_EXISTS if another active recipe exists for the product.
   */
  abstract activate(id: string, companyId: string): Promise<Recipe>;

  /** DRAFT/ACTIVE -> ARCHIVED. */
  abstract archive(id: string, companyId: string): Promise<Recipe>;

  /**
   * Soft-delete a recipe (sets deleted_at). DRAFT and ARCHIVED recipes may be
   * deleted (archive cleanup); ACTIVE recipes are protected because they are
   * currently in use. Company-scoped. Throws RECIPE.NOT_FOUND when missing and
   * RECIPE.ACTIVE_NOT_DELETABLE when the recipe is ACTIVE. recipe_items cascade
   * logically via the deleted_at filter applied by all read queries.
   */
  abstract softDelete(id: string, companyId: string): Promise<void>;

  /** Fetch the single ACTIVE recipe for a product (used by production). */
  abstract getActiveByProduct(productId: string, companyId: string): Promise<Recipe>;
}
