import { CreateStockOpname } from '../../../Domains/stock-opnames/entities/CreateStockOpname';
import { StockOpname } from '../../../Domains/stock-opnames/entities/StockOpname';
import { StockOpnameRepository } from '../../../Domains/stock-opnames/StockOpnameRepository';

/**
 * UseCase: CreateStockOpnameUseCase — create a DRAFT opname header.
 * Items are captured at COUNTING start (snapshot), not here.
 */
export class CreateStockOpnameUseCase {
  constructor(private readonly stockOpnameRepository: StockOpnameRepository) {}

  async execute(payload: unknown, companyId: string, userId: string | null): Promise<StockOpname> {
    const draft = new CreateStockOpname(payload);
    return this.stockOpnameRepository.createDraft(companyId, userId, {
      outletId: draft.outletId,
      opnameDate: draft.opnameDate,
      notes: draft.notes,
    });
  }
}
