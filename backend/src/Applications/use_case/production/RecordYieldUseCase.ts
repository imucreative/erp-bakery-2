import { RecordYield } from '../../../Domains/production/entities/RecordYield';
import { ProductionOrder } from '../../../Domains/production/entities/ProductionOrder';
import { ProductionOrderRepository } from '../../../Domains/production/ProductionOrderRepository';

/**
 * UseCase: RecordYieldUseCase — IN_PROGRESS -> YIELD_COMPLETED.
 * Records actual produced qty, waste, and the finished-goods expiry date.
 */
export class RecordYieldUseCase {
  constructor(private readonly productionOrderRepository: ProductionOrderRepository) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
    actorId: string | null,
  ): Promise<ProductionOrder> {
    const rec = new RecordYield(payload);
    return this.productionOrderRepository.recordYield(id, companyId, {
      actualQty: rec.actualQty,
      wasteQty: rec.wasteQty,
      resultExpiredDate: rec.resultExpiredDate,
      notes: rec.notes,
      actorId,
    });
  }
}
