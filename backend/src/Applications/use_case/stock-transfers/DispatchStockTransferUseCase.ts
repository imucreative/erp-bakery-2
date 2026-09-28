import { StockTransfer } from '../../../Domains/stock-transfers/entities/StockTransfer';
import { StockTransferRepository } from '../../../Domains/stock-transfers/StockTransferRepository';

/**
 * UseCase: DispatchStockTransferUseCase — SUBMITTED -> IN_TRANSIT.
 * Creates TRANSFER_OUT at source. Atomic posting handled by repository.dispatch.
 */
export class DispatchStockTransferUseCase {
  constructor(private readonly stockTransferRepository: StockTransferRepository) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<StockTransfer> {
    return this.stockTransferRepository.dispatch(id, companyId, userId);
  }
}
