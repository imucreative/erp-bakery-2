/**
 * Domain Entity: CreateProductionOrder
 *
 * Validates the payload for scheduling a production order. A production order
 * targets a finished product (resolved via its ACTIVE recipe) at an outlet and
 * a scheduled quantity of finished goods (production-domain §5).
 *
 * The recipe is resolved at scheduling time either explicitly (recipeId) or by
 * the finished product's single ACTIVE recipe (productId). At least one of the
 * two must be supplied; the repository resolves and denormalises the rest.
 */
export class CreateProductionOrder {
  public readonly outletId: string;
  public readonly recipeId: string | null;
  public readonly productId: string | null;
  public readonly scheduledQty: number;
  public readonly productionDate: string | null;
  public readonly notes: string | null;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.outletId = (p.outletId as string).trim();
    this.recipeId = p.recipeId ? String(p.recipeId).trim() : null;
    this.productId = p.productId ? String(p.productId).trim() : null;
    this.scheduledQty = Number(p.scheduledQty);
    this.productionDate = p.productionDate ? String(p.productionDate).trim() : null;
    this.notes = p.notes ? String(p.notes).trim() : null;
  }

  private _verifyPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('CREATE_PRODUCTION_ORDER.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;

    if (!p.outletId || typeof p.outletId !== 'string') {
      throw new Error('CREATE_PRODUCTION_ORDER.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    // Need at least one way to resolve the recipe
    const hasRecipe = typeof p.recipeId === 'string' && p.recipeId.trim().length > 0;
    const hasProduct = typeof p.productId === 'string' && p.productId.trim().length > 0;
    if (!hasRecipe && !hasProduct) {
      throw new Error('CREATE_PRODUCTION_ORDER.RECIPE_OR_PRODUCT_REQUIRED');
    }

    if (
      p.scheduledQty === undefined ||
      p.scheduledQty === null ||
      typeof p.scheduledQty !== 'number' ||
      !Number.isFinite(p.scheduledQty)
    ) {
      throw new Error('CREATE_PRODUCTION_ORDER.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.scheduledQty <= 0) {
      throw new Error('CREATE_PRODUCTION_ORDER.QTY_MUST_BE_POSITIVE');
    }
  }
}
