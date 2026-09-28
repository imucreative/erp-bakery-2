export interface CreateRecipeItemInput {
  ingredientProductId: string;
  qty: number;
  uomId: string;
  lossPercentage: number;
}

/**
 * Domain Entity: CreateRecipe
 *
 * Validates payload for creating a recipe (BOM) DRAFT. A recipe yields a
 * finished product and lists ingredient lines. No ingredient may be the
 * finished product itself.
 */
export class CreateRecipe {
  public readonly name: string;
  public readonly productId: string;
  public readonly yieldQty: number;
  public readonly yieldUomId: string;
  public readonly instructions: string | null;
  public readonly items: CreateRecipeItemInput[];

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.name = (p.name as string).trim();
    this.productId = (p.productId as string).trim();
    this.yieldQty = Number(p.yieldQty);
    this.yieldUomId = (p.yieldUomId as string).trim();
    this.instructions = p.instructions ? String(p.instructions).trim() : null;
    this.items = (p.items as Record<string, unknown>[]).map((raw) => ({
      ingredientProductId: (raw.ingredientProductId as string).trim(),
      qty: Number(raw.qty),
      uomId: (raw.uomId as string).trim(),
      lossPercentage: raw.lossPercentage === undefined ? 0 : Number(raw.lossPercentage),
    }));
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_RECIPE.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;

    if (
      !p.name ||
      typeof p.name !== 'string' ||
      !p.productId ||
      typeof p.productId !== 'string' ||
      !p.yieldUomId ||
      typeof p.yieldUomId !== 'string'
    ) {
      throw new Error('CREATE_RECIPE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (
      p.yieldQty === undefined ||
      p.yieldQty === null ||
      typeof p.yieldQty !== 'number' ||
      !Number.isFinite(p.yieldQty)
    ) {
      throw new Error('CREATE_RECIPE.YIELD_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.yieldQty <= 0) {
      throw new Error('CREATE_RECIPE.YIELD_MUST_BE_POSITIVE');
    }

    if (!Array.isArray(p.items) || p.items.length === 0) {
      throw new Error('CREATE_RECIPE.ITEMS_REQUIRED');
    }

    const seen = new Set<string>();
    for (const raw of p.items as Record<string, unknown>[]) {
      if (!raw || typeof raw !== 'object') {
        throw new Error('CREATE_RECIPE.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (!raw.ingredientProductId || typeof raw.ingredientProductId !== 'string') {
        throw new Error('CREATE_RECIPE.ITEM_INGREDIENT_REQUIRED');
      }
      if (!raw.uomId || typeof raw.uomId !== 'string') {
        throw new Error('CREATE_RECIPE.ITEM_UOM_REQUIRED');
      }
      if (
        raw.qty === undefined ||
        raw.qty === null ||
        typeof raw.qty !== 'number' ||
        !Number.isFinite(raw.qty)
      ) {
        throw new Error('CREATE_RECIPE.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (raw.qty <= 0) {
        throw new Error('CREATE_RECIPE.ITEM_QTY_MUST_BE_POSITIVE');
      }
      if (raw.lossPercentage !== undefined && raw.lossPercentage !== null) {
        const loss = Number(raw.lossPercentage);
        if (!Number.isFinite(loss) || loss < 0 || loss > 100) {
          throw new Error('CREATE_RECIPE.ITEM_LOSS_OUT_OF_RANGE');
        }
      }
      // Ingredient cannot be the finished product itself
      if (raw.ingredientProductId === p.productId) {
        throw new Error('CREATE_RECIPE.INGREDIENT_IS_FINISHED_PRODUCT');
      }
      // No duplicate ingredient within one recipe
      const key = raw.ingredientProductId as string;
      if (seen.has(key)) {
        throw new Error('CREATE_RECIPE.DUPLICATE_INGREDIENT');
      }
      seen.add(key);
    }
  }
}
