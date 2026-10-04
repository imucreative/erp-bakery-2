import {
  SalesOrderRepository,
  SalesRefundResult,
} from '../../../Domains/sales/SalesOrderRepository';

/**
 * UseCase: RefundSalesOrderUseCase — full-order refund (doc 51 §8, OQ-4/OQ-5).
 *
 * Delegates the heavy atomic transaction (lock the PAID order, return every
 * consumed quantity to its original batch via SALE_RETURN inbound movements,
 * create the sales_returns header + items, flip to REFUNDED) to the repository,
 * which runs it in one SERIALIZABLE transaction. The controller enforces the
 * `sales.manage` permission (doc 51 §9, keputusan #7). No business logic
 * duplicated here; the repository is the single transaction boundary.
 */
export class RefundSalesOrderUseCase {
  constructor(private readonly salesOrderRepository: SalesOrderRepository) {}

  async execute(
    orderId: string,
    reason: string | null,
    companyId: string,
    userId: string | null,
  ): Promise<SalesRefundResult> {
    return this.salesOrderRepository.refund(orderId, companyId, userId, reason);
  }
}
