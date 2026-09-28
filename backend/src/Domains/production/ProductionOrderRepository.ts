import { ProductionOrder } from './entities/ProductionOrder';

export interface NewProductionOrderData {
  outletId: string;
  recipeId: string | null;
  productId: string | null;
  scheduledQty: number;
  productionDate: string | null;
  notes: string | null;
  createdBy: string | null;
}

export interface RecordYieldData {
  actualQty: number;
  wasteQty: number;
  resultExpiredDate: string;
  notes: string | null;
  actorId: string | null;
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
 * isolation). Lifecycle transitions are validated in the domain
 * (productionStatus.canTransition) and enforced again in the repository under
 * a concurrency-safe lock.
 *
 * `complete` performs backflushing (production-domain rule #2) atomically:
 *   - resolve the ACTIVE recipe items and compute scaled+loss consumption,
 *   - allocate ingredients FEFO and post PRODUCTION_CONSUME movements,
 *   - if QA passed, create a finished-goods batch and post a PRODUCTION_RESULT
 *     movement; if QA failed, scrap the output (no finished batch),
 *   - persist production_order_materials / production_order_results snapshots,
 *   - flip status to COMPLETED.
 * All of the above commit together in one SERIALIZABLE transaction or none do.
 */
export abstract class ProductionOrderRepository {
  /**
   * Schedule a new production order. Resolves the recipe (explicit recipeId or
   * the product's single ACTIVE recipe), denormalises product_id, computes
   * scale_factor = scheduledQty / recipe.yieldQty, generates PRD-YYYY-NNNNNN.
   */
  abstract schedule(companyId: string, data: NewProductionOrderData): Promise<ProductionOrder>;

  abstract getById(id: string, companyId: string): Promise<ProductionOrder>;

  abstract list(
    companyId: string,
    filter: ProductionOrderListFilter,
  ): Promise<ProductionOrderListResult>;

  /** SCHEDULED -> IN_PROGRESS. */
  abstract start(id: string, companyId: string, actorId: string | null): Promise<ProductionOrder>;

  /** IN_PROGRESS -> YIELD_COMPLETED. Records actual/waste qty + result expiry. */
  abstract recordYield(
    id: string,
    companyId: string,
    data: RecordYieldData,
  ): Promise<ProductionOrder>;

  /** YIELD_COMPLETED -> QA_PASSED. */
  abstract qaPass(
    id: string,
    companyId: string,
    qaNotes: string | null,
    actorId: string | null,
  ): Promise<ProductionOrder>;

  /** YIELD_COMPLETED -> QA_FAILED. */
  abstract qaFail(
    id: string,
    companyId: string,
    qaNotes: string | null,
    actorId: string | null,
  ): Promise<ProductionOrder>;

  /**
   * QA_PASSED|QA_FAILED -> COMPLETED. Executes backflushing atomically.
   * On QA_PASSED the finished-goods batch is created; on QA_FAILED the output
   * is scrapped (ingredients still consumed).
   */
  abstract complete(
    id: string,
    companyId: string,
    actorId: string | null,
  ): Promise<ProductionOrder>;

  /** SCHEDULED -> CANCELLED. */
  abstract cancel(
    id: string,
    companyId: string,
    reason: string | null,
    actorId: string | null,
  ): Promise<ProductionOrder>;
}
