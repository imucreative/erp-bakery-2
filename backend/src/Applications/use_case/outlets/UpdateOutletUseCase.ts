import { Outlet } from '../../../Domains/outlets/entities/Outlet';
import { UpdateOutlet } from '../../../Domains/outlets/entities/UpdateOutlet';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';

/**
 * UseCase: UpdateOutletUseCase
 *
 * 1. Validate the partial payload (via UpdateOutlet domain entity)
 * 2. Apply the update scoped to the company tenant
 */
export class UpdateOutletUseCase {
  constructor(private readonly outletRepository: OutletRepository) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<Outlet> {
    const updateOutlet = new UpdateOutlet(payload);
    return this.outletRepository.updateOutlet(id, companyId, updateOutlet.fields);
  }
}
