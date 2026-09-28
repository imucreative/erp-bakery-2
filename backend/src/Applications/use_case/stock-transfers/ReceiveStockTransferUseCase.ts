import { StockTransfer } from '../../../Domains/stock-transfers/entities/StockTransfer';
import { StockTransferRepository } from '../../../Domains/stock-transfers/StockTransferRepository';

/**
 * UseCase: ReceiveStockTransferUseCase — IN_TRANSIT -> COMPLETED.
 * Creates TRANSFER_IN at destination (resolve/create batch). Atomic posting
 * handled by repository.receive.
 */
export class ReceiveStockTransferUseCase {
  constructor(private readonly stockTransferRepository: StockTransferRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockTransfer> {
    return this.stockTransferRepository.receive(id, companyId, userId);
  }
}
