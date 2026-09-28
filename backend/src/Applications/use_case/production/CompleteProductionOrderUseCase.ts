import { ProductionOrder } from '../../../Domains/production/entities/ProductionOrder';
import { ProductionOrderRepository } from '../../../Domains/production/ProductionOrderRepository';

/**
 * UseCase: CompleteProductionOrderUseCase — QA_PASSED|QA_FAILED -> COMPLETED.
 *
 * Thin: the heavy backflushing transaction (FEFO consume + finished-goods
 * batch creation, all atomic) lives in the repository (production-domain #2).
 */
export class CompleteProductionOrderUseCase {
  constructor(private readonly productionOrderRepository: ProductionOrderRepository) {}

  async execute(id: string, companyId: string, actorId: string | null): Promise<ProductionOrder> {
    return this.productionOrderRepository.complete(id, companyId, actorId);
  }
}
