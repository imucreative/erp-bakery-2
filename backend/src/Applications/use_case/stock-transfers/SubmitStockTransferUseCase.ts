import { StockTransfer } from '../../../Domains/stock-transfers/entities/StockTransfer';
import { StockTransferRepository } from '../../../Domains/stock-transfers/StockTransferRepository';

/**
 * UseCase: SubmitStockTransferUseCase — DRAFT -> SUBMITTED (lock, no movement).
 */
export class SubmitStockTransferUseCase {
  constructor(private readonly stockTransferRepository: StockTransferRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockTransfer> {
    return this.stockTransferRepository.submit(id, companyId, userId);
  }
}
