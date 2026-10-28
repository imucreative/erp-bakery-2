import {
  InventoryRepository,
  BatchListResult,
} from '../../../Domains/inventory/InventoryRepository';
import { InventoryBatch } from '../../../Domains/inventory/entities/InventoryBatch';
import {
  classifyExpiry,
  deriveOperationalStatus,
  ExpiryState,
  BatchStatus,
  isBatchStatus,
} from '../../../Domains/inventory/batchStatus';

export interface BatchesQuery {
  limit: number;
  offset: number;
  outletId?: string;
  productId?: string;
  status?: string;
  operationalStatus?: string;
  includeNonBatch?: boolean;
}

export interface BatchWithExpiry {
  batch: InventoryBatch;
  expiryState: ExpiryState;
  operationalStatus: BatchStatus;
}

export interface BatchesResult {
  rows: BatchWithExpiry[];
  total: number;
}

/**
 * UseCase: GetBatchesUseCase
 *
 * Read-only Batch & Expiry monitoring over inventory_batches
 * (inventory-domain rule #14). Expiry state is backend-derived against the
 * business date using the shared classifier, and `operationalStatus` layers the
 * expiry verdict over the stored lifecycle status without changing it. Non-batch
 * synthetic rows are hidden by default; when included they are marked
 * NOT_APPLICABLE (rule #15).
 */
export class GetBatchesUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(
    query: BatchesQuery,
    companyId: string,
    businessDate: Date = new Date(),
  ): Promise<BatchesResult> {
    if (
      (query.status && !isBatchStatus(query.status)) ||
      (query.operationalStatus && !isBatchStatus(query.operationalStatus))
    ) {
      throw new Error('INVENTORY.INVALID_BATCH_STATUS');
    }

    const result: BatchListResult = await this.inventoryRepository.getBatches(
      companyId,
      {
        limit: query.limit,
        offset: query.offset,
        outletId: query.outletId,
        productId: query.productId,
        status: query.status,
        operationalStatus: query.operationalStatus,
        includeNonBatch: query.includeNonBatch ?? false,
      },
      businessDate,
    );

    const rows: BatchWithExpiry[] = result.rows.map((batch) => {
      const expiryState = classifyExpiry(batch.expiredDate, businessDate, batch.isNonBatch);
      return {
        batch,
        expiryState,
        operationalStatus: deriveOperationalStatus(batch.status, expiryState),
      };
    });

    return { rows, total: result.total };
  }
}
