import { ShiftRepository, ShiftListResult } from '../../../Domains/shifts/ShiftRepository';
import { Shift } from '../../../Domains/shifts/entities/Shift';
import { isShiftStatus } from '../../../Domains/shifts/shiftStatus';

export interface ShiftListQuery {
  limit: number;
  offset: number;
  outletId?: string;
  cashierUserId?: string;
  status?: string;
}

/** UseCase: GetShiftsUseCase — list + detail (read). */
export class GetShiftsUseCase {
  constructor(private readonly shiftRepository: ShiftRepository) {}

  async list(query: ShiftListQuery, companyId: string): Promise<ShiftListResult> {
    if (query.status && !isShiftStatus(query.status)) {
      throw new Error('SHIFT.INVALID_STATUS');
    }
    return this.shiftRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      outletId: query.outletId,
      cashierUserId: query.cashierUserId,
      status: query.status,
    });
  }

  async detail(id: string, companyId: string): Promise<Shift> {
    return this.shiftRepository.getById(id, companyId);
  }
}
