import { ProductionOrder } from './entities/ProductionOrder';

export interface NewProductionOrderData {
  outletId: string;
  recipeId: string | null;
  productId: string | null;
  scheduledQty: number;
  actualQty: number;
  wasteQty: number;
  resultExpiredDate: string | null;
  productionDate: string | null;
  notes: string | null;
  createdBy: string | null;
}

export interface ProductionOrderListFilter {
  limit: number;
  offset: number;
  outletId?: string;
  productId?: string;
  status?: string;
  search?: string;
}

export interface ProductionOrderListResult {
  rows: ProductionOrder[];
  total: number;
}

/** One ingredient line of a producible-quantity calculation. */
export interface ProducibleIngredient {
  ingredientProductId: string;
  uomId: string;
  /** Ingredient needed to produce exactly ONE finished unit (loss + yield applied). */
  requiredPerUnit: number;
  /** Stock on hand of the ingredient at the outlet (sum of ACTIVE batch balances). */
  availableQty: number;
  /** Max finished units this single ingredient can support = floor(available / perUnit). */
  maxUnits: number;
  /** True when this ingredient is (one of) the constraint(s) on producibleQty. */
  isLimiting: boolean;
}

/** Result of the read-only producible-quantity calculation for a product+outlet. */
export interface ProducibleResult {
  recipe: {
    id: string;
    recipeNumber: string;
    name: string;
    yieldQty: number;
    yieldUomId: string;
  };
  /** Max whole finished units producible = MIN(maxUnits) across all ingredients. */
  producibleQty: number;
  items: ProducibleIngredient[];
}

/**
 * Abstract repository — Production Order domain. Company-scoped (SaaS tenant
 * isolation).
 *
 * Production is INSTANT-COMPLETE: `createInstant` is the single production
 * action and performs the whole run atomically (production-domain rule #2) in
 * one SERIALIZABLE transaction:
 *   - resolve the ACTIVE recipe (explicit recipeId or the product's single
 *     ACTIVE recipe) and compute scale_factor = scheduledQty / recipe.yieldQty,
 *   - backflush ingredients: allocate FEFO and post PRODUCTION_CONSUME movements
 *     (throws INVENTORY.INSUFFICIENT_STOCK when ingredient stock cannot cover
 *     the recipe requirement),
 *   - when actualQty > 0, create a finished-goods batch and post a
 *     PRODUCTION_RESULT movement,
 *   - persist production_order_materials / production_order_results snapshots,
 *   - record scheduledQty / actualQty / wasteQty and land the order on
 *     COMPLETED.
 * All of the above commit together or none do.
 */
export abstract class ProductionOrderRepository {
  /**
   * Run and persist a production order in a single atomic action. The returned
   * order is already COMPLETED with its consumed materials and produced results
   * populated.
   */
  abstract createInstant(
    companyId: string,
    data: NewProductionOrderData,
  ): Promise<ProductionOrder>;

  abstract getById(id: string, companyId: string): Promise<ProductionOrder>;

  abstract list(
    companyId: string,
    filter: ProductionOrderListFilter,
  ): Promise<ProductionOrderListResult>;

  /**
   * Read-only production capacity preview for a finished product at an outlet.
   *
   * Resolves the product's single ACTIVE recipe (throws RECIPE.NO_ACTIVE_RECIPE
   * when none), then for each ingredient line computes the per-unit requirement
   * (loss% + recipe yield applied, via the shared consumption math) and the
   * ingredient's stock on hand at the outlet (sum of ACTIVE inventory_batches
   * balances — same source of truth as Stock On Hand, rule #8). The producible
   * quantity is the MIN across ingredients of floor(available / perUnit), i.e.
   * the whole finished units the current ingredient stock can support. This is a
   * pure read — it posts no movements and mutates nothing.
   *
   * The per-ingredient requirement is computed with the SAME expression the
   * instant-complete backflushing path uses, so the preview equals execution.
   */
  abstract getProducible(
    companyId: string,
    productId: string,
    outletId: string,
  ): Promise<ProducibleResult>;
}
