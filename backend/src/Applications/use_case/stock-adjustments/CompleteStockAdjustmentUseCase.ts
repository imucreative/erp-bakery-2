import { StockAdjustment } from '../../../Domains/stock-adjustments/entities/StockAdjustment';
import { StockAdjustmentRepository } from '../../../Domains/stock-adjustments/StockAdjustmentRepository';

/**
 * UseCase: CompleteStockAdjustmentUseCase
 *
 * APPROVED -> COMPLETED. This is the only transition that mutates stock.
 *
 * The heavy lifting (reload each batch FOR UPDATE, derive authoritative
 * before/after, enforce negative-stock ban, append ADJUSTMENT_IN/OUT ledger
 * rows, persist snapshots, flip status) runs inside ONE serializable DB
 * transaction in the repository (rule #20) — so it is atomic. The use case
 * stays thin: it delegates and returns the completed document.
 */
export class CompleteStockAdjustmentUseCase {
  constructor(private readonly stockAdjustmentRepository: StockAdjustmentRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockAdjustment> {
    return this.stockAdjustmentRepository.complete(id, companyId, userId);
  }
}
