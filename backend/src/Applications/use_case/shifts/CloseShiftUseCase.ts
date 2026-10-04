import { CloseShift } from '../../../Domains/shifts/entities/CloseShift';
import { Shift } from '../../../Domains/shifts/entities/Shift';
import { ShiftRepository } from '../../../Domains/shifts/ShiftRepository';

/**
 * UseCase: CloseShiftUseCase — close a cashier shift (OPEN -> CLOSED).
 *
 * Validates payload (CloseShift entity), then delegates to the repository which
 * locks the row, asserts OPEN, derives expected_cash (Fase 1 = opening_cash)
 * and discrepancy (= actual_cash - expected_cash), and persists the close.
 */
export class CloseShiftUseCase {
  constructor(private readonly shiftRepository: ShiftRepository) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<Shift> {
    const data = new CloseShift(payload);
    return this.shiftRepository.closeShift(id, companyId, userId, {
      actualCash: data.actualCash,
      notes: data.notes,
    });
  }
}
