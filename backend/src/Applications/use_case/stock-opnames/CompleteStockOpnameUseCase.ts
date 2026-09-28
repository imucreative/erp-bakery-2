import { StockOpname } from '../../../Domains/stock-opnames/entities/StockOpname';
import { StockOpnameRepository } from '../../../Domains/stock-opnames/StockOpnameRepository';

/**
 * UseCase: CompleteStockOpnameUseCase — APPROVED -> COMPLETED.
 * On non-zero variance the repository generates one reconciling Stock
 * Adjustment and posts ADJUSTMENT_IN/OUT atomically (rule #25). Releases lock.
 */
export class CompleteStockOpnameUseCase {
  constructor(private readonly stockOpnameRepository: StockOpnameRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    return this.stockOpnameRepository.complete(id, companyId, userId);
  }
}
