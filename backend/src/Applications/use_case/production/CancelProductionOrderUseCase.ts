import { ProductionOrder } from '../../../Domains/production/entities/ProductionOrder';
import { ProductionOrderRepository } from '../../../Domains/production/ProductionOrderRepository';

/** UseCase: CancelProductionOrderUseCase — SCHEDULED -> CANCELLED. */
export class CancelProductionOrderUseCase {
  constructor(private readonly productionOrderRepository: ProductionOrderRepository) {}

  async execute(
    id: string,
    companyId: string,
    reason: string | null,
    actorId: string | null,
  ): Promise<ProductionOrder> {
    return this.productionOrderRepository.cancel(id, companyId, reason, actorId);
  }
}
