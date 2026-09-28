import { StockAdjustment } from '../../../Domains/stock-adjustments/entities/StockAdjustment';
import { StockAdjustmentRepository } from '../../../Domains/stock-adjustments/StockAdjustmentRepository';

/**
 * UseCase: ApproveStockAdjustmentUseCase
 * SUBMITTED -> APPROVED. Authorizes posting; no stock mutation yet (rule #19).
 */
export class ApproveStockAdjustmentUseCase {
  constructor(private readonly stockAdjustmentRepository: StockAdjustmentRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockAdjustment> {
    return this.stockAdjustmentRepository.changeStatus(id, companyId, userId, 'APPROVED');
  }
}
