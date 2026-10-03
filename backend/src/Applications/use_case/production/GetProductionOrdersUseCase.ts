import {
  ProductionOrderRepository,
  ProductionOrderListResult,
  ProducibleResult,
} from '../../../Domains/production/ProductionOrderRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';
import { ProductionOrder } from '../../../Domains/production/entities/ProductionOrder';
import { isProductionStatus } from '../../../Domains/production/productionStatus';

export interface ProductionOrderListQuery {
  limit: number;
  offset: number;
  outletId?: string;
  productId?: string;
  status?: string;
  search?: string;
}

/** UseCase: GetProductionOrdersUseCase — list + detail + producible (read). */
export class GetProductionOrdersUseCase {
  constructor(
    private readonly productionOrderRepository: ProductionOrderRepository,
    private readonly outletRepository: OutletRepository,
  ) {}

  async list(
    query: ProductionOrderListQuery,
    companyId: string,
  ): Promise<ProductionOrderListResult> {
    if (query.status && !isProductionStatus(query.status)) {
      throw new Error('PRODUCTION_ORDER.INVALID_STATUS');
    }
    return this.productionOrderRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      outletId: query.outletId,
      productId: query.productId,
      status: query.status,
      search: query.search,
    });
  }

  async detail(id: string, companyId: string): Promise<ProductionOrder> {
    return this.productionOrderRepository.getById(id, companyId);
  }

  /**
   * Producible-quantity preview for a finished product at an outlet (read-only).
   * Validates the outlet belongs to the company (OUTLET.NOT_FOUND) before
   * computing capacity. The recipe resolution + consumption math live in the
   * repository and reuse the exact backflushing formula so preview = execution.
   */
  async producible(
    productId: string,
    outletId: string,
    companyId: string,
  ): Promise<ProducibleResult> {
    // Outlet must exist in the company (throws OUTLET.NOT_FOUND)
    await this.outletRepository.getOutletById(outletId, companyId);
    return this.productionOrderRepository.getProducible(companyId, productId, outletId);
  }
}
