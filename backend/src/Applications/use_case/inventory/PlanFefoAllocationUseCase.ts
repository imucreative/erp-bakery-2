import {
  InventoryRepository,
  FefoAllocation,
} from '../../../Domains/inventory/InventoryRepository';

export interface FefoPlanRequest {
  outletId: string;
  productId: string;
  qty: number;
}

/**
 * UseCase: PlanFefoAllocationUseCase
 *
 * Computes a FEFO consumption plan (First-Expired-First-Out) for `qty` of a
 * product at an outlet. This is the foundation the transactional features
 * (production consume, sales, transfer-out, adjustment-out) will build on.
 *
 * Rules enforced here (input) + in repository (data):
 *  - qty must be a positive finite number
 *  - repository selects ACTIVE, non-expired batches with qty > 0,
 *    ordered by nearest expiry first, and throws INVENTORY.INSUFFICIENT_STOCK
 *    when total available < requested (negative-stock ban, rule #2).
 *
 * Read-only planning — does not mutate stock. Mutation happens later via
 * InventoryRepository.postMovements inside a transaction.
 */
export class PlanFefoAllocationUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(
    request: FefoPlanRequest,
    companyId: string,
    businessDate: Date = new Date(),
  ): Promise<FefoAllocation[]> {
    if (
      request.qty === undefined ||
      request.qty === null ||
      typeof request.qty !== 'number' ||
      !Number.isFinite(request.qty)
    ) {
      throw new Error('FEFO.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (request.qty <= 0) {
      throw new Error('FEFO.QTY_MUST_BE_POSITIVE');
    }

    if (!request.outletId || !request.productId) {
      throw new Error('FEFO.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    return this.inventoryRepository.planFefoAllocation(
      companyId,
      request.outletId,
      request.productId,
      request.qty,
      businessDate,
    );
  }
}
