import { ProductionOrder } from '../../../Domains/production/entities/ProductionOrder';
import { ProductionOrderRepository } from '../../../Domains/production/ProductionOrderRepository';

/** UseCase: StartProductionOrderUseCase — SCHEDULED -> IN_PROGRESS. */
export class StartProductionOrderUseCase {
  constructor(private readonly productionOrderRepository: ProductionOrderRepository) {}

  async execute(id: string, companyId: string, actorId: string | null): Promise<ProductionOrder> {
    return this.productionOrderRepository.start(id, companyId, actorId);
  }
}
