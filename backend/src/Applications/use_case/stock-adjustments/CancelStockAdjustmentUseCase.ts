import { StockAdjustment } from '../../../Domains/stock-adjustments/entities/StockAdjustment';
import { StockAdjustmentRepository } from '../../../Domains/stock-adjustments/StockAdjustmentRepository';

/**
 * UseCase: CancelStockAdjustmentUseCase
 * DRAFT -> CANCELLED or SUBMITTED -> CANCELLED (rule #19).
 * APPROVED/COMPLETED cannot be cancelled (repository rejects the transition).
 */
export class CancelStockAdjustmentUseCase {
  constructor(private readonly stockAdjustmentRepository: StockAdjustmentRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockAdjustment> {
    return this.stockAdjustmentRepository.changeStatus(id, companyId, userId, 'CANCELLED');
  }
}
