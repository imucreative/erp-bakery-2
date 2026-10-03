import { CreateProductionOrder } from '../../../Domains/production/entities/CreateProductionOrder';
import { ProductionOrder } from '../../../Domains/production/entities/ProductionOrder';
import { ProductionOrderRepository } from '../../../Domains/production/ProductionOrderRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';

/**
 * UseCase: CreateProductionOrderUseCase — INSTANT-COMPLETE production run.
 *
 * Creating a production order IS the production action (production-domain §5):
 * 1. Validate payload (CreateProductionOrder entity).
 * 2. Confirm the target outlet exists in the company.
 * 3. Delegate to the repository, which — in one atomic transaction — resolves
 *    the ACTIVE recipe, backflushes ingredients via FEFO (PRODUCTION_CONSUME),
 *    produces the finished-goods batch when actualQty > 0 (PRODUCTION_RESULT),
 *    records scheduled/actual/waste quantities, and lands the order on
 *    COMPLETED.
 */
export class CreateProductionOrderUseCase {
  constructor(
    private readonly productionOrderRepository: ProductionOrderRepository,
    private readonly outletRepository: OutletRepository,
  ) {}

  async execute(
    payload: unknown,
    companyId: string,
    actorId: string | null,
  ): Promise<ProductionOrder> {
    const order = new CreateProductionOrder(payload);

    // Outlet must exist in the company (throws OUTLET.NOT_FOUND)
    await this.outletRepository.getOutletById(order.outletId, companyId);

    return this.productionOrderRepository.createInstant(companyId, {
      outletId: order.outletId,
      recipeId: order.recipeId,
      productId: order.productId,
      scheduledQty: order.scheduledQty,
      actualQty: order.actualQty,
      wasteQty: order.wasteQty,
      resultExpiredDate: order.resultExpiredDate,
      productionDate: order.productionDate,
      notes: order.notes,
      createdBy: actorId,
    });
  }
}
