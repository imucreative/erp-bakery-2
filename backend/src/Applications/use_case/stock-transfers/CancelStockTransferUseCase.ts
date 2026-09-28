import { StockTransfer } from '../../../Domains/stock-transfers/entities/StockTransfer';
import { StockTransferRepository } from '../../../Domains/stock-transfers/StockTransferRepository';

/**
 * UseCase: CancelStockTransferUseCase — DRAFT|SUBMITTED -> CANCELLED.
 * IN_TRANSIT/COMPLETED cannot be cancelled (repository rejects).
 */
export class CancelStockTransferUseCase {
  constructor(private readonly stockTransferRepository: StockTransferRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockTransfer> {
    return this.stockTransferRepository.cancel(id, companyId, userId);
  }
}
