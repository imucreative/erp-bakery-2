import { StockOpname } from '../../../Domains/stock-opnames/entities/StockOpname';
import { StockOpnameRepository } from '../../../Domains/stock-opnames/StockOpnameRepository';

/** UseCase: CancelStockOpnameUseCase — DRAFT/COUNTING/SUBMITTED -> CANCELLED (releases lock). */
export class CancelStockOpnameUseCase {
  constructor(private readonly stockOpnameRepository: StockOpnameRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    return this.stockOpnameRepository.cancel(id, companyId, userId);
  }
}
