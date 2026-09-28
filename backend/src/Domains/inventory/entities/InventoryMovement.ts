import { MovementType } from '../movementTypes';

/**
 * Domain Entity: InventoryMovement (read value object).
 * Immutable ledger row (inventory-domain rule #9). Never edited/deleted.
 */
export class InventoryMovement {
  public readonly id: string;
  public readonly companyId: string;
  public readonly outletId: string;
  public readonly batchId: string;
  public readonly productId: string;
  public readonly movementType: MovementType;
  public readonly qty: number;
  public readonly beforeQty: number;
  public readonly afterQty: number;
  public readonly sourceDocumentType: string | null;
  public readonly sourceDocumentId: string | null;
  public readonly notes: string | null;
  public readonly userId: string | null;
  public readonly createdAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    outletId: string;
    batchId: string;
    productId: string;
    movementType: MovementType;
    qty: number;
    beforeQty: number;
    afterQty: number;
    sourceDocumentType?: string | null;
    sourceDocumentId?: string | null;
    notes?: string | null;
    userId?: string | null;
    createdAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.outletId = payload.outletId;
    this.batchId = payload.batchId;
    this.productId = payload.productId;
    this.movementType = payload.movementType;
    this.qty = Number(payload.qty);
    this.beforeQty = Number(payload.beforeQty);
    this.afterQty = Number(payload.afterQty);
    this.sourceDocumentType = payload.sourceDocumentType ?? null;
    this.sourceDocumentId = payload.sourceDocumentId ?? null;
    this.notes = payload.notes ?? null;
    this.userId = payload.userId ?? null;
    this.createdAt = payload.createdAt;
  }
}
