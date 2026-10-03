/**
 * Domain Entity: CreateProductionOrder
 *
 * Validates the payload for an INSTANT-COMPLETE production run. Creating a
 * production order IS the production action: it targets a finished product
 * (resolved via its ACTIVE recipe) at an outlet, records the target
 * (scheduledQty), the successful output (actualQty), and the scrapped amount
 * (wasteQty), then backflushes ingredients and produces finished goods in one
 * atomic transaction (production-domain §5).
 *
 * The recipe is resolved either explicitly (recipeId) or by the finished
 * product's single ACTIVE recipe (productId). At least one must be supplied;
 * the repository resolves and denormalises the rest.
 *
 * Quantity rules (intentionally minimal — see production-domain §5):
 *   - scheduledQty > 0 (the production target).
 *   - actualQty >= 0 (finished goods that actually succeeded and enter stock).
 *   - wasteQty  >= 0 (failed/scrapped output; never enters stock), default 0.
 *   - resultExpiredDate is required when actualQty > 0 (a stock batch needs an
 *     expiry, inventory-domain rule #10).
 * No hard constraint ties scheduledQty to actualQty + wasteQty: over-yield and
 * under-yield are both legitimate real-world outcomes.
 */
export class CreateProductionOrder {
  public readonly outletId: string;
  public readonly recipeId: string | null;
  public readonly productId: string | null;
  public readonly scheduledQty: number;
  public readonly actualQty: number;
  public readonly wasteQty: number;
  public readonly resultExpiredDate: string | null;
  public readonly productionDate: string | null;
  public readonly notes: string | null;

  constructor(payload: unknown) {
    this._verifyPayload(payload);

    const p = payload as Record<string, unknown>;
    this.outletId = (p.outletId as string).trim();
    this.recipeId = p.recipeId ? String(p.recipeId).trim() : null;
    this.productId = p.productId ? String(p.productId).trim() : null;
    this.scheduledQty = Number(p.scheduledQty);
    this.actualQty = Number(p.actualQty);
    this.wasteQty = p.wasteQty === undefined || p.wasteQty === null ? 0 : Number(p.wasteQty);
    this.resultExpiredDate =
      this.actualQty > 0 ? (p.resultExpiredDate as string).trim() : null;
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

    // scheduledQty: the production target — required, numeric, positive.
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

    // actualQty: successful output — required, numeric, non-negative.
    if (
      p.actualQty === undefined ||
      p.actualQty === null ||
      typeof p.actualQty !== 'number' ||
      !Number.isFinite(p.actualQty)
    ) {
      throw new Error('CREATE_PRODUCTION_ORDER.ACTUAL_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
    if (p.actualQty < 0) {
      throw new Error('CREATE_PRODUCTION_ORDER.ACTUAL_QTY_NEGATIVE');
    }

    // wasteQty: scrapped output — optional, numeric, non-negative.
    if (p.wasteQty !== undefined && p.wasteQty !== null) {
      if (typeof p.wasteQty !== 'number' || !Number.isFinite(p.wasteQty) || p.wasteQty < 0) {
        throw new Error('CREATE_PRODUCTION_ORDER.WASTE_INVALID');
      }
    }

    // A finished-goods batch needs an expiry when something was actually produced.
    if (p.actualQty > 0) {
      if (!p.resultExpiredDate || typeof p.resultExpiredDate !== 'string') {
        throw new Error('CREATE_PRODUCTION_ORDER.RESULT_EXPIRY_REQUIRED');
      }
      if (Number.isNaN(Date.parse(p.resultExpiredDate))) {
        throw new Error('CREATE_PRODUCTION_ORDER.RESULT_EXPIRY_INVALID');
      }
    }
  }
}
