import { SalesOrder } from '../../../Domains/sales/entities/SalesOrder';
import { SalesOrderRepository } from '../../../Domains/sales/SalesOrderRepository';

/**
 * UseCase: VoidSalesOrderUseCase — PENDING_PAYMENT -> CANCELLED (doc 51 §6.1).
 *
 * Only an unpaid order may be voided; the repository asserts the transition and
 * never touches stock. Paid orders must go through refund (Fase 3), not void.
 */
export class VoidSalesOrderUseCase {
  constructor(private readonly salesOrderRepository: SalesOrderRepository) {}

  async execute(orderId: string, companyId: string, userId: string | null): Promise<SalesOrder> {
    return this.salesOrderRepository.void(orderId, companyId, userId);
  }
}
