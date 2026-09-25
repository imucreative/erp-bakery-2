import { Module } from '@nestjs/common';
import { OutletController } from './outlet.controller';

/**
 * OutletModule
 *
 * CreateOutletUseCase, UpdateOutletUseCase and OutletRepository are provided
 * and exported by InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [OutletController],
})
export class OutletModule {}
