import { PaySalesOrder } from '../../../Domains/sales/entities/PaySalesOrder';
import { SalesOrder } from '../../../Domains/sales/entities/SalesOrder';
import { SalesOrderRepository } from '../../../Domains/sales/SalesOrderRepository';

/**
 * UseCase: PaySalesOrderUseCase — pay + deduct stock (doc 51 §7.2).
 *
 * Validates the payment payload, then delegates the heavy atomic transaction
 * (lock order, Σ check, FEFO deduction for both sale modes, SALE movements,
 * consumption snapshots, payments, status flip) to the repository, which runs
 * it in one SERIALIZABLE transaction. No business logic duplication here.
 */
export class PaySalesOrderUseCase {
  constructor(private readonly salesOrderRepository: SalesOrderRepository) {}

  async execute(
    orderId: string,
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<SalesOrder> {
    const data = new PaySalesOrder(payload);
    return this.salesOrderRepository.pay(orderId, companyId, userId, data.payments);
  }
}
