import {
  ProductionOrderRepository,
  ProductionOrderListResult,
} from '../../../Domains/production/ProductionOrderRepository';
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

/** UseCase: GetProductionOrdersUseCase — list + detail (read). */
export class GetProductionOrdersUseCase {
  constructor(private readonly productionOrderRepository: ProductionOrderRepository) {}

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
}
