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
}
