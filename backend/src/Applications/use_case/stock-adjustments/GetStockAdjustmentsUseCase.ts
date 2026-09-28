import {
  StockAdjustmentRepository,
  StockAdjustmentListResult,
} from '../../../Domains/stock-adjustments/StockAdjustmentRepository';
import { StockAdjustment } from '../../../Domains/stock-adjustments/entities/StockAdjustment';
import { isAdjustmentStatus } from '../../../Domains/stock-adjustments/adjustmentStatus';

export interface StockAdjustmentListQuery {
  limit: number;
  offset: number;
  outletId?: string;
  status?: string;
  search?: string;
}

/**
 * UseCase: GetStockAdjustmentsUseCase — list + detail (read).
 */
export class GetStockAdjustmentsUseCase {
  constructor(private readonly stockAdjustmentRepository: StockAdjustmentRepository) {}

  async list(query: StockAdjustmentListQuery, companyId: string): Promise<StockAdjustmentListResult> {
    if (query.status && !isAdjustmentStatus(query.status)) {
      throw new Error('STOCK_ADJUSTMENT.INVALID_STATUS');
    }
    return this.stockAdjustmentRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      outletId: query.outletId,
      status: query.status,
      search: query.search,
    });
  }

  async detail(id: string, companyId: string): Promise<StockAdjustment> {
    return this.stockAdjustmentRepository.getById(id, companyId);
  }
}
