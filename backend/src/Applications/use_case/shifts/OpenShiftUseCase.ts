import { OpenShift } from '../../../Domains/shifts/entities/OpenShift';
import { Shift } from '../../../Domains/shifts/entities/Shift';
import { ShiftRepository } from '../../../Domains/shifts/ShiftRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';

/**
 * UseCase: OpenShiftUseCase — open a cashier shift (status OPEN).
 *
 * Validates payload (OpenShift entity), asserts the target outlet belongs to
 * the acting company, then delegates the race-safe insert to the repository.
 * The "one OPEN shift per cashier+outlet" invariant is enforced by the DB
 * partial unique index (23505 -> SHIFT.ALREADY_OPEN) in the repository.
 */
export class OpenShiftUseCase {
  constructor(
    private readonly shiftRepository: ShiftRepository,
    private readonly outletRepository: OutletRepository,
  ) {}

  async execute(payload: unknown, companyId: string, cashierUserId: string | null): Promise<Shift> {
    const data = new OpenShift(payload);

    // Company-scope guard: outlet must belong to the acting company.
    // getOutletById throws OUTLET.NOT_FOUND when the outlet is missing or
    // belongs to another tenant.
    await this.outletRepository.getOutletById(data.outletId, companyId);

    return this.shiftRepository.openShift(companyId, cashierUserId, {
      outletId: data.outletId,
      openingCash: data.openingCash,
      notes: data.notes,
    });
  }
}
