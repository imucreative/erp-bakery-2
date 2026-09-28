import {
  StockTransferRepository,
  StockTransferListResult,
} from '../../../Domains/stock-transfers/StockTransferRepository';
import { StockTransfer } from '../../../Domains/stock-transfers/entities/StockTransfer';
import { isTransferStatus } from '../../../Domains/stock-transfers/transferStatus';

export interface StockTransferListQuery {
  limit: number;
  offset: number;
  sourceOutletId?: string;
  destinationOutletId?: string;
  status?: string;
  search?: string;
}

/**
 * UseCase: GetStockTransfersUseCase — list + detail (read).
 */
export class GetStockTransfersUseCase {
  constructor(private readonly stockTransferRepository: StockTransferRepository) {}

  async list(query: StockTransferListQuery, companyId: string): Promise<StockTransferListResult> {
    if (query.status && !isTransferStatus(query.status)) {
      throw new Error('STOCK_TRANSFER.INVALID_STATUS');
    }
    return this.stockTransferRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      sourceOutletId: query.sourceOutletId,
      destinationOutletId: query.destinationOutletId,
      status: query.status,
      search: query.search,
    });
  }

  async detail(id: string, companyId: string): Promise<StockTransfer> {
    return this.stockTransferRepository.getById(id, companyId);
  }
}
