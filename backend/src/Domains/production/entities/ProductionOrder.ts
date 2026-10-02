import { ProductionStatus } from '../productionStatus';

/** A single ingredient consumed (backflushed) by a completed production order. */
export interface ProductionMaterial {
  id: string;
  recipeItemId: string | null;
  productId: string;
  batchId: string;
  plannedQty: number;
  qtyConsumed: number;
}

/** A finished-goods batch produced by a completed production order. */
export interface ProductionResult {
  id: string;
  productId: string;
  batchId: string;
  batchNumber: string;
  expiredDate: Date;
  qtyProduced: number;
}

/**
 * Domain Entity: ProductionOrder (read value object) — header + the consumed
 * materials and produced results. Since production is instant-complete, these
 * are always populated for a persisted order (production-domain §5).
 */
export class ProductionOrder {
  public readonly id: string;
  public readonly companyId: string;
  public readonly outletId: string;
  public readonly productionNumber: string;
  public readonly recipeId: string;
  public readonly productId: string;
  public readonly scaleFactor: number;
  public readonly scheduledQty: number;
  public readonly actualQty: number | null;
  public readonly wasteQty: number;
  public readonly productionDate: Date;
  public readonly resultExpiredDate: Date | null;
  public readonly status: ProductionStatus;
  public readonly notes: string | null;
  public readonly resultBatchId: string | null;
  public readonly materials: ProductionMaterial[];
  public readonly results: ProductionResult[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    outletId: string;
    productionNumber: string;
    recipeId: string;
    productId: string;
    scaleFactor: number;
    scheduledQty: number;
    actualQty: number | null;
    wasteQty: number;
    productionDate: Date;
    resultExpiredDate: Date | null;
    status: ProductionStatus;
    notes: string | null;
    resultBatchId: string | null;
    materials?: ProductionMaterial[];
    results?: ProductionResult[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.outletId = payload.outletId;
    this.productionNumber = payload.productionNumber;
    this.recipeId = payload.recipeId;
    this.productId = payload.productId;
    this.scaleFactor = payload.scaleFactor;
    this.scheduledQty = payload.scheduledQty;
    this.actualQty = payload.actualQty;
    this.wasteQty = payload.wasteQty;
    this.productionDate = payload.productionDate;
    this.resultExpiredDate = payload.resultExpiredDate;
    this.status = payload.status;
    this.notes = payload.notes;
    this.resultBatchId = payload.resultBatchId;
    this.materials = payload.materials ?? [];
    this.results = payload.results ?? [];
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}
