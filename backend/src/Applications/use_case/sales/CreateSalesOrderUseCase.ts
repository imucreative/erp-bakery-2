import { CreateSalesOrder } from '../../../Domains/sales/entities/CreateSalesOrder';
import { SalesOrder } from '../../../Domains/sales/entities/SalesOrder';
import { SalesOrderRepository } from '../../../Domains/sales/SalesOrderRepository';
import { ShiftRepository } from '../../../Domains/shifts/ShiftRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';

/**
 * UseCase: CreateSalesOrderUseCase — POS checkout (doc 51 §7.1).
 *
 * Steps (business orchestration; no DB queries here):
 *  1. Validate payload (CreateSalesOrder entity).
 *  2. Company-scope guard: outlet belongs to the company.
 *  3. Validate the shift is OPEN and belongs to the cashier + outlet
 *     (else SHIFT.NOT_OPEN).
 *  4. Resolve items deterministically via the repository (mode + topping
 *     allow-list + price snapshots + per-line total). Throws
 *     RECIPE.NO_ACTIVE_RECIPE / TOPPING.NOT_ALLOWED.
 *  5. Compute header totals SERVER-SIDE (tax = 0; order discount capped to
 *     subtotal so grand_total never goes negative).
 *  6. Persist header + items + toppings as PENDING_PAYMENT (no stock touched).
 */
export class CreateSalesOrderUseCase {
  constructor(
    private readonly salesOrderRepository: SalesOrderRepository,
    private readonly shiftRepository: ShiftRepository,
    private readonly outletRepository: OutletRepository,
  ) {}

  async execute(
    payload: unknown,
    companyId: string,
    cashierUserId: string | null,
  ): Promise<SalesOrder> {
    const data = new CreateSalesOrder(payload);

    // Outlet must belong to the acting company (throws OUTLET.NOT_FOUND).
    await this.outletRepository.getOutletById(data.outletId, companyId);

    // Shift must exist, be OPEN, and match the cashier + outlet.
    const shift = await this.shiftRepository.getById(data.shiftId, companyId);
    if (
      shift.status !== 'OPEN' ||
      shift.outletId !== data.outletId ||
      (cashierUserId !== null && shift.cashierUserId !== cashierUserId)
    ) {
      throw new InvariantError('SHIFT.NOT_OPEN');
    }

    // Deterministic resolution (mode, toppings, price snapshots, line totals).
    const { items } = await this.salesOrderRepository.resolveCheckoutItems(
      companyId,
      data.items,
    );

    // Header totals (server-side). tax = 0 (MVP). Clamp order discount so the
    // grand total never goes negative (doc 29 §7: discount <= total).
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const orderDiscount = Math.min(data.orderDiscount, subtotal);
    const tax = 0;
    const grandTotal = subtotal - orderDiscount + tax;
    const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

    return this.salesOrderRepository.createOrder(companyId, {
      outletId: data.outletId,
      shiftId: data.shiftId,
      customerName: data.customerName,
      itemCount,
      subtotal,
      orderDiscount,
      tax,
      grandTotal,
      cashierUserId,
      items,
    });
  }
}
