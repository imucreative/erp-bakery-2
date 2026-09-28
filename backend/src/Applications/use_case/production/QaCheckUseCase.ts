import { ProductionOrder } from '../../../Domains/production/entities/ProductionOrder';
import { ProductionOrderRepository } from '../../../Domains/production/ProductionOrderRepository';

/**
 * UseCase: QaCheckUseCase — YIELD_COMPLETED -> QA_PASSED | QA_FAILED.
 * A single use case with an explicit `passed` decision keeps the QA workflow
 * in one place; the repository enforces the transition.
 */
export class QaCheckUseCase {
  constructor(private readonly productionOrderRepository: ProductionOrderRepository) {}

  async execute(
    id: string,
    passed: boolean,
    companyId: string,
    qaNotes: string | null,
    actorId: string | null,
  ): Promise<ProductionOrder> {
    if (passed) {
      return this.productionOrderRepository.qaPass(id, companyId, qaNotes, actorId);
    }
    return this.productionOrderRepository.qaFail(id, companyId, qaNotes, actorId);
  }
}
