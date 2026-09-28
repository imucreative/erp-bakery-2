import { StockOpname } from '../../../Domains/stock-opnames/entities/StockOpname';
import { StockOpnameRepository } from '../../../Domains/stock-opnames/StockOpnameRepository';

/**
 * UseCase: StartStockOpnameUseCase — DRAFT -> COUNTING.
 * Snapshots batch balances and locks the outlet. Atomic in repository.start.
 */
export class StartStockOpnameUseCase {
  constructor(private readonly stockOpnameRepository: StockOpnameRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    return this.stockOpnameRepository.start(id, companyId, userId);
  }
}
