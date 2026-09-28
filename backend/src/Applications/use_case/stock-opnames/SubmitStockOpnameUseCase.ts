import { StockOpname } from '../../../Domains/stock-opnames/entities/StockOpname';
import { StockOpnameRepository } from '../../../Domains/stock-opnames/StockOpnameRepository';

/** UseCase: SubmitStockOpnameUseCase — COUNTING -> SUBMITTED. */
export class SubmitStockOpnameUseCase {
  constructor(private readonly stockOpnameRepository: StockOpnameRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockOpname> {
    return this.stockOpnameRepository.submit(id, companyId, userId);
  }
}
