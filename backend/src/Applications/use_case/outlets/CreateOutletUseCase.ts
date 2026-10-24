import { CreateOutlet } from '../../../Domains/outlets/entities/CreateOutlet';
import { Outlet } from '../../../Domains/outlets/entities/Outlet';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';

/**
 * UseCase: CreateOutletUseCase
 *
 * 1. Validate & normalise input (via CreateOutlet domain entity)
 * 2. Use the client-supplied code when present, otherwise generate the next
 *    outlet code scoped to the company (OUT-###)
 * 3. Persist the outlet within the company tenant
 */
export class CreateOutletUseCase {
  constructor(private readonly outletRepository: OutletRepository) {}

  async execute(payload: unknown, companyId: string): Promise<Outlet> {
    const createOutlet = new CreateOutlet(payload);

    const code = createOutlet.code ?? (await this.outletRepository.generateOutletCode(companyId));

    return this.outletRepository.addOutlet(
      {
        code,
        name: createOutlet.name,
        address: createOutlet.address,
        phone: createOutlet.phone,
      },
      companyId,
    );
  }
}
