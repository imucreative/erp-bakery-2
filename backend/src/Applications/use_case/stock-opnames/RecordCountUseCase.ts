import { RecordCount } from '../../../Domains/stock-opnames/entities/RecordCount';
import { StockOpname } from '../../../Domains/stock-opnames/entities/StockOpname';
import { StockOpnameRepository } from '../../../Domains/stock-opnames/StockOpnameRepository';

/**
 * UseCase: RecordCountUseCase — record a physical count for one opname item.
 * Only allowed while COUNTING (enforced by repository).
 */
export class RecordCountUseCase {
  constructor(private readonly stockOpnameRepository: StockOpnameRepository) {}

  async execute(
    id: string,
    itemId: string,
    payload: unknown,
    companyId: string,
  ): Promise<StockOpname> {
    const { countedQty } = new RecordCount(payload);
    return this.stockOpnameRepository.recordCount(id, itemId, companyId, countedQty);
  }
}
