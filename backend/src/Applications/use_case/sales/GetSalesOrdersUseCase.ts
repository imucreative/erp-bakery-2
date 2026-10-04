import { SalesOrder } from '../../../Domains/sales/entities/SalesOrder';
import {
  SalesOrderRepository,
  SalesOrderListFilter,
  SalesOrderListResult,
  PosProductFilter,
  PosProductResult,
  PosToppingOption,
} from '../../../Domains/sales/SalesOrderRepository';
import { SalesReturn } from '../../../Domains/sales/entities/SalesReturn';

/**
 * UseCase: GetSalesOrdersUseCase — read side of the Sales module.
 *
 * list/detail of sales orders, plus the POS product grid (sellable products +
 * resolved mode + hasToppings flag, doc 51 §10) and the GLOBAL topping catalog
 * lookup used by the POS modifier panel.
 */
export class GetSalesOrdersUseCase {
  constructor(private readonly salesOrderRepository: SalesOrderRepository) {}

  async list(filter: SalesOrderListFilter, companyId: string): Promise<SalesOrderListResult> {
    return this.salesOrderRepository.list(companyId, filter);
  }

  async detail(id: string, companyId: string): Promise<SalesOrder> {
    return this.salesOrderRepository.getById(id, companyId);
  }

  async returnByOrderId(orderId: string, companyId: string): Promise<SalesReturn | null> {
    return this.salesOrderRepository.getReturnByOrderId(orderId, companyId);
  }

  async posProducts(filter: PosProductFilter, companyId: string): Promise<PosProductResult> {
    return this.salesOrderRepository.listPosProducts(companyId, filter);
  }

  async activeToppings(companyId: string): Promise<PosToppingOption[]> {
    return this.salesOrderRepository.listActiveToppings(companyId);
  }
}
