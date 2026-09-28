import { CreateProductionOrder } from '../../../Domains/production/entities/CreateProductionOrder';
import { ProductionOrder } from '../../../Domains/production/entities/ProductionOrder';
import { ProductionOrderRepository } from '../../../Domains/production/ProductionOrderRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';

/**
 * UseCase: CreateProductionOrderUseCase — schedule a production order.
 *
 * 1. Validate payload (CreateProductionOrder entity)
 * 2. Confirm the target outlet exists in the company
 * 3. Delegate to repository: resolve recipe (explicit or product's ACTIVE
 *    recipe), compute scale_factor, generate PRD number, persist SCHEDULED.
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

    return this.productionOrderRepository.schedule(companyId, {
      outletId: order.outletId,
      recipeId: order.recipeId,
      productId: order.productId,
      scheduledQty: order.scheduledQty,
      productionDate: order.productionDate,
      notes: order.notes,
      createdBy: actorId,
    });
  }
}
