import { StockAdjustment } from '../../../Domains/stock-adjustments/entities/StockAdjustment';
import { StockAdjustmentRepository } from '../../../Domains/stock-adjustments/StockAdjustmentRepository';

/**
 * UseCase: SubmitStockAdjustmentUseCase
 * DRAFT -> SUBMITTED. Locks the document; no stock mutation (rule #19).
 * Transition validity is enforced by the repository (canTransition).
 */
export class SubmitStockAdjustmentUseCase {
  constructor(private readonly stockAdjustmentRepository: StockAdjustmentRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockAdjustment> {
    return this.stockAdjustmentRepository.changeStatus(id, companyId, userId, 'SUBMITTED');
  }
}
