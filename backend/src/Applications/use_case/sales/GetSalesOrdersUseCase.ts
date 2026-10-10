import { SalesOrder } from '../../../Domains/sales/entities/SalesOrder';
import {
  SalesOrderRepository,
  SalesOrderListFilter,
  SalesOrderListResult,
  PosProductFilter,
  PosProductResult,
  PosToppingOption,
} from '../../../Domains/sales/SalesOrderRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';
import { SalesReturn } from '../../../Domains/sales/entities/SalesReturn';
import { AuthorizationError } from '../../../Commons/exceptions/AuthorizationError';

/**
 * Acting principal for outlet-scoped reads. Derived from the JWT identity by
 * the controller, exactly as OutletController does for GET /outlets/accessible:
 * OWNER / super-admin reach every non-deleted outlet of the company, any other
 * user only their ACTIVE user_outlets assignments.
 */
export interface OutletReadScope {
  userId: string;
  allOutlets: boolean;
}

/**
 * UseCase: GetSalesOrdersUseCase — read side of the Sales module.
 *
 * list/detail of sales orders, plus the POS product grid (sellable products +
 * topping capability + hasToppings flag, doc 51 §10) and the GLOBAL topping
 * catalog lookup used by the POS modifier panel.
 *
 * posProducts also enforces outlet authorization (doc 24 §10.9): the grid
 * exposes per-outlet stock figures (availableQty / expiredQty), so an
 * explicitly requested outletId must be one the caller may operate in.
 */
export class GetSalesOrdersUseCase {
  constructor(
    private readonly salesOrderRepository: SalesOrderRepository,
    private readonly outletRepository: OutletRepository,
  ) {}

  async list(filter: SalesOrderListFilter, companyId: string): Promise<SalesOrderListResult> {
    return this.salesOrderRepository.list(companyId, filter);
  }

  async detail(id: string, companyId: string): Promise<SalesOrder> {
    return this.salesOrderRepository.getById(id, companyId);
  }

  async returnByOrderId(orderId: string, companyId: string): Promise<SalesReturn | null> {
    return this.salesOrderRepository.getReturnByOrderId(orderId, companyId);
  }

  /**
   * POS product grid. The grid returns per-outlet stock figures
   * (availableQty / expiredQty), so an explicit outletId is an authorization
   * subject, not just a filter (doc 24 §10.9): it is asserted against the
   * backend-derived accessible outlet set before the repository runs. An
   * outlet the caller cannot operate in is rejected with
   * AUTHORIZATION.ACCESS_DENIED — never silently answered with zeroes.
   *
   * When no outletId is supplied there is no outlet to authorize, so the
   * behaviour is unchanged (both figures collapse to 0 in the repository).
   */
  async posProducts(
    filter: PosProductFilter,
    companyId: string,
    scope: OutletReadScope,
  ): Promise<PosProductResult> {
    if (filter.outletId) {
      const accessible = await this.outletRepository.findAccessibleByUser(
        scope.userId,
        companyId,
        scope.allOutlets,
      );
      if (!accessible.some((outlet) => outlet.id === filter.outletId)) {
        throw new AuthorizationError('AUTHORIZATION.ACCESS_DENIED');
      }
    }

    return this.salesOrderRepository.listPosProducts(companyId, filter);
  }

  async activeToppings(companyId: string): Promise<PosToppingOption[]> {
    return this.salesOrderRepository.listActiveToppings(companyId);
  }
}
