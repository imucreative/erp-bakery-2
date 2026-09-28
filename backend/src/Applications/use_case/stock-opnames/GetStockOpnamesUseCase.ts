import {
  StockOpnameRepository,
  StockOpnameListResult,
} from '../../../Domains/stock-opnames/StockOpnameRepository';
import { StockOpname } from '../../../Domains/stock-opnames/entities/StockOpname';
import { isOpnameStatus } from '../../../Domains/stock-opnames/opnameStatus';

export interface StockOpnameListQuery {
  limit: number;
  offset: number;
  outletId?: string;
  status?: string;
  search?: string;
}

/** UseCase: GetStockOpnamesUseCase — list + detail (read). */
export class GetStockOpnamesUseCase {
  constructor(private readonly stockOpnameRepository: StockOpnameRepository) {}

  async list(query: StockOpnameListQuery, companyId: string): Promise<StockOpnameListResult> {
    if (query.status && !isOpnameStatus(query.status)) {
      throw new Error('STOCK_OPNAME.INVALID_STATUS');
    }
    return this.stockOpnameRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      outletId: query.outletId,
      status: query.status,
      search: query.search,
    });
  }

  async detail(id: string, companyId: string): Promise<StockOpname> {
    return this.stockOpnameRepository.getById(id, companyId);
  }
}
